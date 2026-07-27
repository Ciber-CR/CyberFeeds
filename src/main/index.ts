import { app, BrowserWindow, shell, screen } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import { initDb, getSettings, getWindowState, saveWindowState, backfillFavicons, cleanupOldArticles } from './db'
import { startPolling, setOnNewArticles } from './polling'
import { registerIpc, setAutoStart } from './ipc'
import { initUpdater } from './updater'
import { initNotifier, registerNotifierIpc, showNotification } from './notifications'
import { createTray } from './tray'
import type { NotificationHistoryItem, WindowState } from './types'
import crypto from 'crypto'

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', () => {
  // Someone tried to run a second instance, focus the existing window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

let mainWindow: BrowserWindow | null = null

const MIN_WINDOW_WIDTH = 800
const MIN_WINDOW_HEIGHT = 600

const THEME_BACKGROUND: Record<string, string> = {
  dark: '#0d1117',
  light: '#f6f8fa',
  dracula: '#282a36',
  nord: '#2e3440',
  hacker: '#0d0d0d',
  monokai: '#272822'
}

/**
 * Fit saved window bounds into a single display work area.
 * Prevents oversized windows (esp. with mixed DPI / scale factors) from
 * spilling onto a neighboring monitor.
 */
function clampWindowStateToWorkArea(state: WindowState): WindowState {
  const point = {
    x: Math.round((state.x ?? 0) + state.width / 2),
    y: Math.round((state.y ?? 0) + state.height / 2)
  }
  const display = screen.getDisplayNearestPoint(point)
  const wa = display.workArea

  const width = Math.min(Math.max(state.width || MIN_WINDOW_WIDTH, MIN_WINDOW_WIDTH), wa.width)
  const height = Math.min(Math.max(state.height || MIN_WINDOW_HEIGHT, MIN_WINDOW_HEIGHT), wa.height)

  let x = state.x ?? wa.x
  let y = state.y ?? wa.y
  x = Math.min(Math.max(x, wa.x), wa.x + wa.width - width)
  y = Math.min(Math.max(y, wa.y), wa.y + wa.height - height)

  return { ...state, x, y, width, height }
}

/** Restore the main window preserving maximized state. */
export function restoreMainWindow(): void {
  const win = mainWindow
  if (!win || win.isDestroyed()) return

  if (!win.isVisible()) win.show()
  if (win.isMinimized()) win.restore()

  win.maximize()
  win.focus()
}

function createMainWindow(): BrowserWindow {
  const windowState = clampWindowStateToWorkArea(getWindowState())
  const theme = getSettings().theme || 'dark'

  // Start hidden only when launched by Windows startup with "start minimized"
  // enabled. The login item is registered with a `--hidden` arg in that case
  // (see setAutoStart), so a manual launch never carries the flag and shows
  // the window normally.
  const startHidden = process.argv.includes('--hidden')

  const win = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: THEME_BACKGROUND[theme] ?? THEME_BACKGROUND.dark,
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  })

  // Restore saved maximized state unless starting hidden in the tray
  if (!startHidden && windowState.maximized) {
    win.maximize()
  }

  // Show window or hide to tray depending on the Windows-startup launch
  win.on('ready-to-show', () => {
    if (startHidden) {
      // Force brief show/hide to initialize renderer context (prevents black/grey screen and notification failures when hidden)
      win.show()
      win.hide()
    } else {
      win.show()
    }
  })

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Minimize to tray on close (respect setting)
  win.on('close', (e) => {
    if (!(app as any).isQuitting && getSettings().minimizeToTray) {
      e.preventDefault()
      win.hide()
    }
  })

  // Save window state (clamp so a bad drag across monitors never persists overflow)
  const saveState = (): void => {
    if (win.isDestroyed()) return
    const maximized = win.isMaximized()
    // Prefer normal (restore) bounds while maximized so unmaximize stays correct
    const bounds = maximized ? win.getNormalBounds() : win.getBounds()
    const next = clampWindowStateToWorkArea({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized
    })
    saveWindowState({ ...next, maximized })
  }

  win.on('resize', saveState)
  win.on('move', saveState)
  win.on('maximize', saveState)
  win.on('unmaximize', saveState)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  if (!gotTheLock) return

  initDb()
  backfillFavicons()  // Assign Google S2 favicon URLs to any feeds missing icons
  const settings = getSettings()

  registerIpc()
  registerNotifierIpc()
  initNotifier(settings.notifications)

  mainWindow = createMainWindow()
  createTray(mainWindow)

  // Wire new-article notifications
  setOnNewArticles((feedId, inserted, feedTitle, feedIcon) => {
    for (const article of inserted) {
      const item: NotificationHistoryItem = {
        id: crypto.randomUUID(),
        title: article.title,
        body: article.snippet,
        link: article.link,
        feedName: feedTitle,
        icon: feedIcon,
        thumbnail: article.thumbnail,
        createdAt: Date.now(),
        feedId: feedId,
        articleId: article.id
      }
      showNotification(item)
    }
    // Tell renderer to refresh article count
    mainWindow?.webContents.send('articles:updated', { feedId, count: inserted.length })
  })

  // Auto cleanup on startup
  if (settings.autoCleanup && settings.cleanupReadDays > 0) {
    cleanupOldArticles(settings.cleanupReadDays)
  }

  // Start polling
  console.log(`[Main] Startup: Polling interval is ${settings.pollingInterval} minutes`)
  startPolling(settings.pollingInterval)

  // Auto-start
  setAutoStart(settings.autoStart, settings.startMinimized)

  // Auto-update (electron-updater). No-op in dev / unpacked builds.
  initUpdater(settings)
})

app.on('before-quit', () => {
  ;(app as any).isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})

// Window controls
import { ipcMain } from 'electron'
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.on('window:close', () => mainWindow?.close())
