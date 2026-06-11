import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import path from 'path'
import { pollFeeds } from './polling'
import { restoreMainWindow } from './index'
import * as db from './db'
import { translations } from '../shared/translations'

let tray: Tray | null = null
let _mainWindow: BrowserWindow | null = null

export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = path.join(__dirname, '../../resources/tray.png')
  tray = new Tray(iconPath)
  _mainWindow = mainWindow

  buildMenu()

  tray.setToolTip('CyberFeeds')

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

function buildMenu(): void {
  const version = app.getVersion()
  const lang = db.getSettings().language || 'en'
  const t = translations[lang].mainProcess.tray

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
      accelerator: 'Ctrl+Shift+`',
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
      label: t.notifications,
      icon: iconNotifications,
      accelerator: 'Ctrl+Shift+O',
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
      accelerator: 'Ctrl+Shift+I',
      click: () => {
        const win = _mainWindow
        if (!win || win.isDestroyed()) return
        restoreMainWindow()
        win.webContents.send('app:openSettings')
      }
    },
    {
      label: t.fetchNow,
      icon: iconFetch,
      accelerator: 'Ctrl+Shift+F5',
      click: () => { pollFeeds() }
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
  tray?.destroy()
  tray = null
}
