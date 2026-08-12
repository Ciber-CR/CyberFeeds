import { Tray, Menu, app, BrowserWindow, nativeImage, globalShortcut } from 'electron'
import path from 'path'
import { pollFeeds } from './polling'
import { restoreMainWindow } from './index'
import * as db from './db'
import { translations } from '../shared/translations'
import type { KeyboardShortcuts } from '../shared/types'

let tray: Tray | null = null
let _mainWindow: BrowserWindow | null = null
let registeredGlobalShortcuts: string[] = []

export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = path.join(__dirname, '../../resources/tray.png')
  tray = new Tray(iconPath)
  _mainWindow = mainWindow

  buildMenu()
  registerGlobalShortcuts()

  tray.setToolTip(`CyberFeeds v${app.getVersion()}`)

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
  const iconQuit = nativeImage.createFromPath(path.join(iconsDir, 'quit.png'))

  const isVisible = _mainWindow && !_mainWindow.isDestroyed() && _mainWindow.isVisible()
  const parts = t.showHide.split(' / ')
  const dynamicLabel = isVisible
    ? (parts[1] || 'Hide')
    : (parts[0] || 'Show')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `CyberFeeds v${version}`,
      enabled: false,
      icon: nativeImage.createEmpty()
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
  tray?.setContextMenu(contextMenu)
}

export function destroyTray(): void {
  unregisterGlobalShortcuts()
  tray?.destroy()
  tray = null
}
