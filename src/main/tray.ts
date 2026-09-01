import { Tray, Menu, app, BrowserWindow, nativeImage, globalShortcut, screen, shell } from 'electron'
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
let animTimer: NodeJS.Timeout | null = null
let currentFrame = 1

let currentScaleFactor = 0
let cachedIdleImage: Electron.NativeImage | null = null
const cachedFrames: Electron.NativeImage[] = []

function loadTrayFrame(frameNumber?: number): Electron.NativeImage {
  const resourcesDir = path.join(__dirname, '../../resources')
  const scale = screen.getPrimaryDisplay().scaleFactor
  const px = Math.max(16, Math.round(16 * scale))

  // Invalidate cache if DPI / scale factor changed
  if (scale !== currentScaleFactor) {
    currentScaleFactor = scale
    cachedIdleImage = null
    cachedFrames.length = 0
  }

  if (frameNumber && frameNumber >= 1 && frameNumber <= 4) {
    if (cachedFrames[frameNumber]) {
      return cachedFrames[frameNumber]
    }
    const hiRes = nativeImage.createFromPath(path.join(resourcesDir, `tray-frame-${frameNumber}.png`))
    if (!hiRes.isEmpty()) {
      const resized = hiRes.resize({ width: px, height: px, quality: 'best' })
      cachedFrames[frameNumber] = resized
      return resized
    }
    const trayPng = nativeImage.createFromPath(path.join(resourcesDir, `tray-frame-${frameNumber}-32.png`))
    if (!trayPng.isEmpty()) {
      const resized = trayPng.getSize().width === px ? trayPng : trayPng.resize({ width: px, height: px, quality: 'best' })
      cachedFrames[frameNumber] = resized
      return resized
    }
  }

  if (cachedIdleImage) return cachedIdleImage

  const hiRes = nativeImage.createFromPath(path.join(resourcesDir, 'icon.png'))
  if (!hiRes.isEmpty()) {
    cachedIdleImage = hiRes.resize({ width: px, height: px, quality: 'best' })
    return cachedIdleImage
  }

  const trayPng = nativeImage.createFromPath(path.join(resourcesDir, 'tray.png'))
  if (!trayPng.isEmpty()) {
    const { width } = trayPng.getSize()
    cachedIdleImage = width === px ? trayPng : trayPng.resize({ width: px, height: px, quality: 'best' })
    return cachedIdleImage
  }

  cachedIdleImage = nativeImage.createFromPath(path.join(resourcesDir, 'icon.ico'))
  return cachedIdleImage
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

  const isBusy = activeActivities.size > 0

  if (isBusy) {
    if (!animTimer) {
      currentFrame = 1
      if (tray && !tray.isDestroyed()) {
        try {
          tray.setImage(loadTrayFrame(currentFrame))
          updateTrayTooltip(true)
        } catch {
          /* ignore */
        }
      }
      animTimer = setInterval(() => {
        if (!tray || tray.isDestroyed()) {
          if (animTimer) {
            clearInterval(animTimer)
            animTimer = null
          }
          return
        }
        currentFrame = (currentFrame % 4) + 1
        try {
          tray.setImage(loadTrayFrame(currentFrame))
        } catch {
          if (animTimer) {
            clearInterval(animTimer)
            animTimer = null
          }
        }
      }, 180)
    }
  } else {
    if (animTimer) {
      clearInterval(animTimer)
      animTimer = null
    }
    currentFrame = 1
    if (tray && !tray.isDestroyed()) {
      try {
        tray.setImage(loadTrayFrame())
        updateTrayTooltip(false)
      } catch {
        /* ignore */
      }
    }
  }
}

export function createTray(mainWindow: BrowserWindow): Tray {
  tray = new Tray(loadTrayFrame())
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

  const resourcesDir = path.join(__dirname, '../../resources')
  const iconsDir = path.join(resourcesDir, 'menu-icons')
  const iconShowHide = nativeImage.createFromPath(path.join(iconsDir, 'show-hide.png'))
  const iconNotifications = nativeImage.createFromPath(path.join(iconsDir, 'notifications.png'))
  const iconSettings = nativeImage.createFromPath(path.join(iconsDir, 'settings.png'))
  const refreshIcon = nativeImage.createFromPath(path.join(iconsDir, 'refresh.png'))
  const iconFetch = refreshIcon.isEmpty()
    ? nativeImage.createFromPath(path.join(iconsDir, 'fetch.png'))
    : refreshIcon
  const neutralPause = nativeImage.createFromPath(path.join(iconsDir, 'pause.png'))
  const iconPause = neutralPause.isEmpty()
    ? nativeImage.createFromPath(path.join(iconsDir, 'pause-blue.png'))
    : neutralPause
  const iconPlay = nativeImage.createFromPath(path.join(iconsDir, 'play-green.png'))
  const iconQuit = nativeImage.createFromPath(path.join(iconsDir, 'quit.png'))

  const iconHelp = nativeImage.createFromPath(path.join(iconsDir, 'help.png'))
  const iconFaq = nativeImage.createFromPath(path.join(iconsDir, 'faq.png'))
  const iconChangelog = nativeImage.createFromPath(path.join(iconsDir, 'changelog.png'))
  const iconHome = nativeImage.createFromPath(path.join(iconsDir, 'homepage.png'))
  const iconAbout = nativeImage.createFromPath(path.join(iconsDir, 'about.png'))
  const iconUpdate = nativeImage.createFromPath(path.join(iconsDir, 'update.png'))

  const brandIcon = nativeImage.createFromPath(path.join(resourcesDir, 'tray.png')).resize({ width: 16, height: 16, quality: 'best' })
  const iconBrand = brandIcon.isEmpty()
    ? nativeImage.createFromPath(path.join(resourcesDir, 'icon.ico')).resize({ width: 16, height: 16, quality: 'best' })
    : brandIcon

  const isVisible = _mainWindow && !_mainWindow.isDestroyed() && _mainWindow.isVisible()
  const parts = t.showHide.split(' / ')
  const dynamicLabel = isVisible
    ? (parts[1] || 'Hide')
    : (parts[0] || 'Show')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `CyberFeeds v${version}`,
      icon: iconBrand,
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
      label: t.updateFeeds,
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
    {
      label: t.help,
      icon: iconHelp,
      submenu: [
        {
          label: t.help,
          icon: iconHelp,
          click: () => { void shell.openExternal('https://github.com/CyberGems/CyberFeeds/wiki') }
        },
        {
          label: t.faq,
          icon: iconFaq,
          click: () => { void shell.openExternal('https://github.com/CyberGems/CyberFeeds/wiki') }
        },
        {
          label: t.changelog,
          icon: iconChangelog,
          click: () => { void shell.openExternal('https://github.com/CyberGems/CyberFeeds/releases') }
        },
        {
          label: t.homepage,
          icon: iconHome,
          click: () => { void shell.openExternal('https://cybergems.org') }
        },
        { type: 'separator' },
        {
          label: t.about,
          icon: iconAbout,
          click: () => {
            const win = _mainWindow
            if (!win || win.isDestroyed()) return
            restoreMainWindow()
            win.webContents.send('app:openAbout')
          }
        },
        {
          label: t.checkUpdates,
          icon: iconUpdate,
          click: () => {
            const win = _mainWindow
            if (!win || win.isDestroyed()) return
            restoreMainWindow()
            win.webContents.send('app:openAbout')
          }
        }
      ]
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
  if (animTimer) {
    clearInterval(animTimer)
    animTimer = null
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
