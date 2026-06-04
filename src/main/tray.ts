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

  return tray
}

export function rebuildTrayMenu(): void {
  buildMenu()
}

function buildMenu(): void {
  const version = app.getVersion()
  const lang = db.getSettings().language || 'en'
  const t = translations[lang].mainProcess.tray

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `CyberFeeds v${version}`,
      enabled: false,
      icon: nativeImage.createEmpty()
    },
    { type: 'separator' },
    {
      label: t.showHide,
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
      click: () => {
        const win = _mainWindow
        if (!win || win.isDestroyed()) return
        restoreMainWindow()
        win.webContents.send('app:openHistory')
      }
    },
    {
      label: t.settings,
      click: () => {
        const win = _mainWindow
        if (!win || win.isDestroyed()) return
        restoreMainWindow()
        win.webContents.send('app:openSettings')
      }
    },
    {
      label: t.fetchNow,
      click: () => { pollFeeds() }
    },
    { type: 'separator' },
    {
      label: t.quit,
      click: () => { app.quit() }
    }
  ])
  tray?.setContextMenu(contextMenu)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
