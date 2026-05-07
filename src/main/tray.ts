import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import path from 'path'
import { pollFeeds } from './polling'
import { restoreMainWindow } from './index'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = path.join(__dirname, '../../resources/tray.png')
  tray = new Tray(iconPath)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show CyberFeeds',
      click: () => {
        restoreMainWindow()
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

  tray.setToolTip('CyberFeeds')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    restoreMainWindow()
  })

  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
