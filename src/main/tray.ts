import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import path from 'path'
import { pollFeeds } from './polling'
import { restoreMainWindow } from './index'

let tray: Tray | null = null
let _mainWindow: BrowserWindow | null = null

export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = path.join(__dirname, '../../resources/tray.png')
  tray = new Tray(iconPath)
  _mainWindow = mainWindow

  buildMenu()

  tray.setToolTip('CyberGems')

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

function buildMenu(): void {
  const version = app.getVersion()
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `CyberGems v${version}`,
      enabled: false,
      icon: nativeImage.createEmpty()
    },
    { type: 'separator' },
    {
      label: 'Show / Hide',
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
      label: 'Settings',
      click: () => {
        const win = _mainWindow
        if (!win || win.isDestroyed()) return
        restoreMainWindow()
        win.webContents.send('app:openSettings')
      }
    },
    {
      label: 'Fetch Now',
      click: () => { pollFeeds() }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { app.quit() }
    }
  ])
  tray?.setContextMenu(contextMenu)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
