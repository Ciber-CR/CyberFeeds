import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import { initDb, getSettings, getWindowState, saveWindowState, backfillFavicons } from './db'
import { startPolling, setOnNewArticles } from './polling'
import { registerIpc } from './ipc'
import { initNotifier, registerNotifierIpc, showNotification } from './notifications'
import { createTray } from './tray'
import type { NotificationHistoryItem } from './types'
import crypto from 'crypto'

let mainWindow: BrowserWindow | null = null

/** Restore the main window preserving maximized state. */
export function restoreMainWindow(): void {
  const win = mainWindow
  if (!win || win.isDestroyed()) return

  // Remember if the window was maximized before it was hidden
  const wasMaximized = win.isMaximized()

  if (!win.isVisible()) win.show()
  if (win.isMinimized()) win.restore()

  // show() and restore() on Windows can un-maximize — re-apply
  if (wasMaximized && !win.isMaximized()) win.maximize()

  win.focus()
}

function createMainWindow(): BrowserWindow {
  const windowState = getWindowState()

  const win = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0d1117',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  })

  if (windowState.maximized) win.maximize()

  win.on('ready-to-show', () => win.show())

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

  // Save window state
  const saveState = (): void => {
    if (win.isDestroyed()) return
    const bounds = win.getBounds()
    saveWindowState({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, maximized: win.isMaximized() })
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
  initDb()
  backfillFavicons()  // Assign Google S2 favicon URLs to any feeds missing icons
  const settings = getSettings()

  // Register IPC
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

  // Start polling
  startPolling(settings.pollingInterval)

  // Auto-start
  app.setLoginItemSettings({ openAtLogin: settings.autoStart })
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
