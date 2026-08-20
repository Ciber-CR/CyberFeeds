import { Tray, Menu, app, BrowserWindow, nativeImage, globalShortcut, screen } from 'electron'
import path from 'path'
import { pollFeeds } from './polling'
import { restoreMainWindow } from './index'
import * as db from './db'
import { translations } from '../shared/translations'
import type { KeyboardShortcuts } from '../shared/types'

let tray: Tray | null = null
let _mainWindow: BrowserWindow | null = null
let registeredGlobalShortcuts: string[] = []

const activeActivities = new Set<'polling' | 'batch'>()
let blinkTimer: NodeJS.Timeout | null = null
let isBlinkStateOn = false

function loadTrayImage(busy = false): Electron.NativeImage {
  const resourcesDir = path.join(__dirname, '../../resources')
  // Windows tray is 16 logical px; use physical px so HiDPI is not an upscaled 16x16.
  const px = Math.max(16, Math.round(16 * screen.getPrimaryDisplay().scaleFactor))
  const filename = busy ? 'icon-busy.png' : 'icon.png'
  const trayFilename = busy ? 'tray-busy.png' : 'tray.png'

  const hiRes = nativeImage.createFromPath(path.join(resourcesDir, filename))
  if (!hiRes.isEmpty()) {
    return hiRes.resize({ width: px, height: px, quality: 'best' })
  }

  const trayPng = nativeImage.createFromPath(path.join(resourcesDir, trayFilename))
  if (!trayPng.isEmpty()) {
    const { width } = trayPng.getSize()
    if (width === px) return trayPng
    return trayPng.resize({ width: px, height: px, quality: 'best' })
  }

  return nativeImage.createFromPath(path.join(resourcesDir, 'icon.ico'))
}

function updateTrayTooltip(busy: boolean): void {
  if (!tray || tray.isDestroyed()) return
  const version = app.getVersion()
  if (busy) {
    const lang = db.getSettings().language || 'en'
    const loadingText = translations[lang]?.mainProcess?.tray?.loadingFeeds || 'Loading feeds...'
    try {
      tray.setToolTip(`CyberFeeds v${version} — ${loadingText}`)
    } catch {
      /* ignore if destroyed */
    }
  } else {
    try {
      tray.setToolTip(`CyberFeeds v${version}`)
    } catch {
      /* ignore if destroyed */
    }
  }
}

export function setTrayActivity(source: 'polling' | 'batch', active: boolean): void {
  if (active) {
    activeActivities.add(source)
  } else {
    activeActivities.delete(source)
  }

  const shouldBlink = activeActivities.size > 0

  if (shouldBlink) {
    if (!blinkTimer) {
      isBlinkStateOn = true
      if (tray && !tray.isDestroyed()) {
        try {
          tray.setImage(loadTrayImage(true))
          updateTrayTooltip(true)
        } catch {
          /* ignore */
        }
      }
      blinkTimer = setInterval(() => {
        if (!tray || tray.isDestroyed()) {
          if (blinkTimer) {
            clearInterval(blinkTimer)
            blinkTimer = null
          }
          return
        }
        isBlinkStateOn = !isBlinkStateOn
        try {
          tray.setImage(loadTrayImage(isBlinkStateOn))
        } catch {
          if (blinkTimer) {
            clearInterval(blinkTimer)
            blinkTimer = null
          }
        }
      }, 450)
    }
  } else {
    if (blinkTimer) {
      clearInterval(blinkTimer)
      blinkTimer = null
    }
    isBlinkStateOn = false
    if (tray && !tray.isDestroyed()) {
      try {
        tray.setImage(loadTrayImage(false))
        updateTrayTooltip(false)
      } catch {
        /* ignore */
      }
    }
  }
}

export function createTray(mainWindow: BrowserWindow): Tray {
  tray = new Tray(loadTrayImage(false))
  _mainWindow = mainWindow

  buildMenu()
  registerGlobalShortcuts()

  updateTrayTooltip(false)

  tray.on('click', () => {
    const win = _mainWindow
    if (!win || win.isDestroyed()) return
    if (win.isVisible()) {
      win.hide()
    } else {
      restoreMainWindow()
    }
  })

  tray.on('double-click', () => {
    restoreMainWindow()
  })

  // Rebuild menu automatically when window is shown or hidden to update label
  mainWindow.on('show', () => {
    buildMenu()
  })
  mainWindow.on('hide', () => {
    buildMenu()
  })

  return tray
}

export function rebuildTrayMenu(): void {
  buildMenu()
}

export function rebuildGlobalShortcuts(): void {
  unregisterGlobalShortcuts()
  registerGlobalShortcuts()
}

function registerGlobalShortcuts(): void {
  const settings = db.getSettings()
  const shortcuts = settings.shortcuts as KeyboardShortcuts

  unregisterGlobalShortcuts()

  if (shortcuts.showHide.enabled && shortcuts.showHide.global) {
    globalShortcut.register(shortcuts.showHide.accelerator, () => {
      const win = _mainWindow
      if (!win || win.isDestroyed()) return
      if (win.isVisible()) {
        win.hide()
      } else {
        restoreMainWindow()
      }
    })
    registeredGlobalShortcuts.push(shortcuts.showHide.accelerator)
  }

  if (shortcuts.notifications.enabled && shortcuts.notifications.global) {
    globalShortcut.register(shortcuts.notifications.accelerator, () => {
      const win = _mainWindow
      if (!win || win.isDestroyed()) return
      restoreMainWindow()
      win.webContents.send('app:openHistory')
    })
    registeredGlobalShortcuts.push(shortcuts.notifications.accelerator)
  }

  if (shortcuts.settings.enabled && shortcuts.settings.global) {
    globalShortcut.register(shortcuts.settings.accelerator, () => {
      const win = _mainWindow
      if (!win || win.isDestroyed()) return
      restoreMainWindow()
      win.webContents.send('app:openSettings')
    })
    registeredGlobalShortcuts.push(shortcuts.settings.accelerator)
  }

  if (shortcuts.fetch.enabled && shortcuts.fetch.global) {
    globalShortcut.register(shortcuts.fetch.accelerator, () => {
      pollFeeds()
    })
    registeredGlobalShortcuts.push(shortcuts.fetch.accelerator)
  }
}

function unregisterGlobalShortcuts(): void {
  // Unregister anything we believe we registered during this runtime.
  for (const accelerator of registeredGlobalShortcuts) {
    globalShortcut.unregister(accelerator)
  }

  // Extra safety: also try to unregister the current DB shortcuts.
  // This prevents stale registrations surviving across hot-reloads/resets.
  try {
    const shortcuts = db.getSettings().shortcuts as KeyboardShortcuts
    const candidates = [
      shortcuts.showHide.accelerator,
      shortcuts.notifications.accelerator,
      shortcuts.settings.accelerator,
      shortcuts.fetch.accelerator
    ]

    for (const acc of candidates) {
      if (acc) globalShortcut.unregister(acc)
    }
  } catch {
    // ignore
  }

  registeredGlobalShortcuts = []
}


function buildMenu(): void {
  if (!tray || tray.isDestroyed()) return
  const version = app.getVersion()
  const settings = db.getSettings()
  const lang = settings.language || 'en'
  const t = translations[lang].mainProcess.tray
  const shortcuts = settings.shortcuts as KeyboardShortcuts

  const iconsDir = path.join(__dirname, '../../resources/menu-icons')
  const iconShowHide = nativeImage.createFromPath(path.join(iconsDir, 'show-hide.png'))
  const iconNotifications = nativeImage.createFromPath(path.join(iconsDir, 'notifications.png'))
  const iconSettings = nativeImage.createFromPath(path.join(iconsDir, 'settings.png'))
  const iconFetch = nativeImage.createFromPath(path.join(iconsDir, 'fetch.png'))
  const iconPause = nativeImage.createFromPath(path.join(iconsDir, 'pause-blue.png'))
  const iconPlay = nativeImage.createFromPath(path.join(iconsDir, 'play-green.png'))
  const iconQuit = nativeImage.createFromPath(path.join(iconsDir, 'quit.png'))

  const isVisible = _mainWindow && !_mainWindow.isDestroyed() && _mainWindow.isVisible()
  const parts = t.showHide.split(' / ')
  const dynamicLabel = isVisible
    ? (parts[1] || 'Hide')
    : (parts[0] || 'Show')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `CyberFeeds v${version}`,
      icon: nativeImage.createEmpty(),
      click: () => {
        const win = _mainWindow
        if (!win || win.isDestroyed()) return
        restoreMainWindow()
        win.webContents.send('app:openAbout')
      }
    },
    { type: 'separator' },
    {
      label: dynamicLabel,
      icon: iconShowHide,
      accelerator: shortcuts.showHide.enabled ? shortcuts.showHide.accelerator : undefined,
      click: () => {
        const win = _mainWindow
        if (!win || win.isDestroyed()) return
        if (win.isVisible()) {
          win.hide()
        } else {
          restoreMainWindow()
        }
      }
    },
    {
      label: t.fetchNow,
      icon: iconFetch,
      accelerator: shortcuts.fetch.enabled ? shortcuts.fetch.accelerator : undefined,
      click: () => { pollFeeds() }
    },
    {
      label: settings.pollingEnabled ? t.pauseFeeds : t.resumeFeeds,
      icon: settings.pollingEnabled ? iconPause : iconPlay,
      click: () => {
        const current = db.getSettings()
        const pollingEnabled = !current.pollingEnabled
        db.saveSettings({ ...current, pollingEnabled })
        buildMenu()
        if (_mainWindow && !_mainWindow.isDestroyed()) {
          _mainWindow.webContents.send('settings:pollingToggled', pollingEnabled)
        }
      }
    },
    {
      label: t.notifications,
      icon: iconNotifications,
      accelerator: shortcuts.notifications.enabled ? shortcuts.notifications.accelerator : undefined,
      click: () => {
        const win = _mainWindow
        if (!win || win.isDestroyed()) return
        restoreMainWindow()
        win.webContents.send('app:openHistory')
      }
    },
    {
      label: t.settings,
      icon: iconSettings,
      accelerator: shortcuts.settings.enabled ? shortcuts.settings.accelerator : undefined,
      click: () => {
        const win = _mainWindow
        if (!win || win.isDestroyed()) return
        restoreMainWindow()
        win.webContents.send('app:openSettings')
      }
    },
    { type: 'separator' },
    {
      label: t.quit,
      icon: iconQuit,
      click: () => { app.quit() }
    }
  ])
  try {
    tray.setContextMenu(contextMenu)
  } catch {
    /* ignore if destroyed */
  }
}

export function destroyTray(): void {
  if (blinkTimer) {
    clearInterval(blinkTimer)
    blinkTimer = null
  }
  unregisterGlobalShortcuts()
  if (tray && !tray.isDestroyed()) {
    try {
      tray.destroy()
    } catch {
      /* ignore if destroyed */
    }
  }
  tray = null
}
