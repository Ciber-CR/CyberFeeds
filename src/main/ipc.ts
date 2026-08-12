import { ipcMain, shell, dialog, screen, Menu, MenuItemConstructorOptions, BrowserWindow, clipboard, nativeImage } from 'electron'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { Worker } from 'worker_threads'
import { app } from 'electron'
import * as db from './db'
import * as polling from './polling'
import { importOpml, exportOpml } from './opml'
import { updateNotifierSettings } from './notifications'
import { setAutoUpdate } from './updater'
import { rebuildTrayMenu, rebuildGlobalShortcuts } from './tray'
import { translations } from '../shared/translations'
import { DEFAULT_SETTINGS } from '../shared/types'
import { normalizeFeedUrl } from '../shared/reddit'
import { robustParse } from './feed-parse'
import type { Feed, Folder } from './types'

/**
 * Sync the Windows login item with the current settings. When the app is set
 * to both start with Windows and start minimized, the login item is registered
 * with a `--hidden` arg so the startup launch can be told apart from a manual
 * one (which should always show the window).
 */
export function setAutoStart(autoStart: boolean, startMinimized: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: autoStart,
      args: autoStart && startMinimized ? ['--hidden'] : []
    })
  } catch { /* ignore */ }
}

function uuid(): string { return crypto.randomUUID() }

// Content extractor worker (persistent, reused across requests)
let extractorWorker: Worker | null = null
let pendingExtractions = new Map<string, (result: { html?: string; error?: string }) => void>()

function getExtractorWorker(): Worker {
  if (extractorWorker) return extractorWorker

  const workerPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'out', 'main', 'content-extractor.worker.js')
    : path.join(app.getAppPath(), 'out', 'main', 'content-extractor.worker.js')

  extractorWorker = new Worker(workerPath)
  extractorWorker.on('message', (result: { reqId: string; html?: string; error?: string }) => {
    const resolve = pendingExtractions.get(result.reqId)
    if (resolve) {
      pendingExtractions.delete(result.reqId)
      resolve(result)
    }
  })
  extractorWorker.on('error', () => { extractorWorker = null })
  extractorWorker.on('exit', () => { extractorWorker = null })
  return extractorWorker
}

function extractContent(url: string): Promise<{ html?: string; error?: string }> {
  return new Promise(resolve => {
    const reqId = uuid()
    pendingExtractions.set(reqId, resolve)
    getExtractorWorker().postMessage({ reqId, url })
    // Timeout safety
    setTimeout(() => {
      if (pendingExtractions.has(reqId)) {
        pendingExtractions.delete(reqId)
        resolve({ error: 'Timeout' })
      }
    }, 15000)
  })
}

export function registerIpc(): void {
  // ─── Feeds ───────────────────────────────────────────────────────────────

  ipcMain.handle('feeds:getAll', () => db.getFeeds())

  ipcMain.handle('feeds:add', async (_, url: string, folderId: string, customTitle?: string) => {
    try {
      const normalizedUrl = normalizeFeedUrl(url)

      // Check for duplicate (including alternate Reddit URL forms)
      const existing = db.getFeeds().find(f => normalizeFeedUrl(f.url) === normalizedUrl)
      if (existing) return { error: 'Feed already exists' }

      // Parse to get title (using robust fallback)
      const parsed = await robustParse(normalizedUrl)
      const title = customTitle || parsed.title || normalizedUrl

      // Favicon from Google API
      let icon: string | undefined
      try {
        const feedLink = parsed.link || normalizedUrl
        const domain = new URL(feedLink).hostname
        icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
      } catch { /* no icon */ }

      const feed: Feed = { id: uuid(), title, url: normalizedUrl, link: parsed.link, folderId, icon, errorCount: 0 }
      db.addFeed(feed)

      // Immediately fetch articles for new feed
      polling.pollFeeds([feed])

      return { feed }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('feeds:preview', async (_, url: string) => {
    try {
      const normalizedUrl = normalizeFeedUrl(url)
      const parsed = await robustParse(normalizedUrl)
      return {
        title: parsed.title,
        description: parsed.description,
        link: parsed.link,
        items: (parsed.items || []).slice(0, 5).map(i => ({ title: i.title, pubDate: i.pubDate, link: i.link }))
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('feeds:update', (_, id: string, changes: Partial<Feed>) => {
    db.updateFeed({ id, ...changes })
    return db.getFeedById(id)
  })

  ipcMain.handle('feeds:delete', (_, id: string) => {
    db.deleteFeed(id)
    return { ok: true }
  })

  ipcMain.handle('feeds:fetchOne', async (_, id: string) => {
    const feed = db.getFeedById(id)
    if (!feed) return { error: 'Feed not found' }
    await polling.pollFeeds([feed])
    return { ok: true }
  })

  ipcMain.handle('feeds:fetchAll', async () => {
    await polling.pollFeeds()
    return { ok: true }
  })

  ipcMain.handle('feeds:fetchFolder', async (_, folderId: string) => {
    const feeds = db.getFeeds().filter(f => f.folderId === folderId)
    if (feeds.length > 0) {
      await polling.pollFeeds(feeds)
    }
    return { ok: true }
  })

  ipcMain.handle('feeds:togglePause', (_, id: string) => {
    const feed = db.getFeedById(id)
    if (feed) {
      const disabled = !feed.disabled
      db.updateFeed({ id, disabled })
      return { ok: true, disabled }
    }
    return { error: 'Feed not found' }
  })

  ipcMain.handle('feeds:togglePauseFolder', (_, folderId: string) => {
    const feeds = db.getFeeds().filter(f => f.folderId === folderId)
    if (feeds.length === 0) return { ok: true }
    
    // Toggle based on the first feed's state
    const targetState = !feeds[0].disabled
    for (const f of feeds) {
      db.updateFeed({ id: f.id, disabled: targetState })
    }
    return { ok: true, disabled: targetState }
  })

  // ─── Folders ─────────────────────────────────────────────────────────────

  ipcMain.handle('folders:getAll', () => db.getFolders())

  ipcMain.handle('folders:add', (_, name: string) => {
    const folders = db.getFolders()
    const folder: Folder = { id: uuid(), name, sortOrder: folders.length }
    db.addFolder(folder)
    return folder
  })

  ipcMain.handle('settings:togglePolling', () => {
    const settings = db.getSettings()
    const pollingEnabled = !settings.pollingEnabled
    db.saveSettings({ ...settings, pollingEnabled })
    return { ok: true, pollingEnabled }
  })

  ipcMain.handle('folders:update', (_, id: string, name: string) => {
    db.updateFolder(id, name)
    return { ok: true }
  })

  ipcMain.handle('folders:delete', (_, id: string) => {
    db.deleteFolder(id)
    return { ok: true }
  })

  ipcMain.handle('folders:reorder', (_, ids: string[]) => {
    db.reorderFolders(ids)
    return { ok: true }
  })

  // ─── Articles ─────────────────────────────────────────────────────────────

  ipcMain.handle('articles:get', (_, query) => {
    return db.getArticles(query)
  })

  ipcMain.handle('articles:getCount', (_, query) => {
    return db.getArticleCount(query)
  })

  ipcMain.handle('articles:getUnreadCounts', () => {
    return db.getUnreadCountByFeed()
  })

  ipcMain.handle('articles:getToday', () => {
    return db.getTodayArticles()
  })

  ipcMain.handle('articles:markRead', (_, id: string, read: boolean) => {
    db.markArticleRead(id, read)
    return { ok: true }
  })

  ipcMain.handle('articles:markAllRead', (_, feedId?: string) => {
    db.markAllRead(feedId)
    return { ok: true }
  })

  ipcMain.handle('articles:star', (_, id: string, starred: boolean) => {
    db.starArticle(id, starred)
    return { ok: true }
  })

  ipcMain.handle('articles:delete', (_, id: string) => {
    db.deleteArticle(id)
    return { ok: true }
  })

  ipcMain.handle('articles:fetchContent', async (_, articleId: string) => {
    const article = db.getArticleById(articleId)
    if (!article) return { error: 'Article not found' }
    const result = await extractContent(article.link)
    return result
  })

  ipcMain.handle('articles:getById', (_, id: string) => {
    return db.getArticleById(id)
  })

  // ─── Settings ─────────────────────────────────────────────────────────────

  ipcMain.handle('settings:get', () => db.getSettings())

  ipcMain.handle('settings:save', (_, settings) => {
    const current = db.getSettings()

    // Normalize payload to avoid structured-clone issues and ensure full shape.
    // This prevents Electron IPC conversion failures on complex objects.
    const normalized = { ...DEFAULT_SETTINGS, ...settings }
    db.saveSettings(normalized)

    updateNotifierSettings(settings.notifications)
    if (settings.pollingInterval !== current.pollingInterval) {
      polling.restartPolling(settings.pollingInterval)
    }

    // Auto-start
    setAutoStart(settings.autoStart, settings.startMinimized)

    // Auto-update toggle
    setAutoUpdate(settings.autoUpdate)

    // Rebuild tray menu and global shortcuts
    rebuildTrayMenu()
    if (settings.shortcuts !== current.shortcuts) {
      rebuildGlobalShortcuts()
    }

    return { ok: true }
  })

  // ─── Notification History ─────────────────────────────────────────────────

  ipcMain.handle('notifications:getHistory', () => db.getNotificationHistory())

  ipcMain.handle('notifications:clearHistory', () => {
    db.clearNotificationHistory()
    return { ok: true }
  })

  // Renderer tells main the history was just opened/seen, so the notifier badge
  // can compute the same unseen count as the main-window badge.
  ipcMain.handle('notifications:markChecked', (_e, ts?: number) => {
    db.setNotificationsLastChecked(typeof ts === 'number' ? ts : Date.now())
    return { ok: true }
  })

  // ─── OPML ─────────────────────────────────────────────────────────────────

  ipcMain.handle('opml:import', async (event) => {
    const win = event.sender ? require('electron').BrowserWindow.fromWebContents(event.sender) : null
    const result = await dialog.showOpenDialog(win || undefined, {
      filters: [{ name: 'OPML', extensions: ['opml', 'xml'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return { canceled: true }

    const imported = importOpml(result.filePaths[0])
    let added = 0

    for (const item of imported.feeds) {
      const existing = db.getFeeds().find(f => f.url === item.url)
      if (existing) continue

      // Find or create folder
      let folderId = ''
      if (item.folderName) {
        const folders = db.getFolders()
        const existing = folders.find(f => f.name === item.folderName)
        if (existing) {
          folderId = existing.id
        } else {
          const newFolder: Folder = { id: uuid(), name: item.folderName, sortOrder: folders.length }
          db.addFolder(newFolder)
          folderId = newFolder.id
        }
      }

      try {
        // Attempt to get favicon
        let icon: string | undefined
        try {
          const domain = new URL(item.link || item.url).hostname
          icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
        } catch { /* no icon */ }

        const feed: Feed = { id: uuid(), title: item.title, url: item.url, link: item.link, folderId, icon, errorCount: 0 }
        db.addFeed(feed)
        added++
      } catch { /* skip duplicate */ }
    }

    // Fetch all feeds
    polling.pollFeeds()

    return { added, total: imported.feeds.length }
  })

  ipcMain.handle('opml:export', async (event) => {
    const win = event.sender ? require('electron').BrowserWindow.fromWebContents(event.sender) : null
    const result = await dialog.showSaveDialog(win || undefined, {
      defaultPath: 'cybersfeeds-export.opml',
      filters: [{ name: 'OPML', extensions: ['opml'] }]
    })
    if (result.canceled || !result.filePath) return { canceled: true }

    const feeds = db.getFeeds()
    const folders = db.getFolders()
    const xml = exportOpml(feeds, folders)
    fs.writeFileSync(result.filePath, xml, 'utf-8')
    return { ok: true, path: result.filePath }
  })

  // ─── Shell ────────────────────────────────────────────────────────────────

  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    const settings = db.getSettings()
    if (settings.customBrowserPath) {
      const { execFile } = require('child_process')
      return new Promise<void>((resolve) => {
        execFile(settings.customBrowserPath, [url], () => resolve())
      })
    }
    return shell.openExternal(url)
  })

  ipcMain.handle('app:pickBrowser', async () => {
    const win = BrowserWindow.getAllWindows()[0]
    const result = await dialog.showOpenDialog(win || undefined, {
      title: 'Select browser executable',
      filters: [
        { name: 'Executables', extensions: ['exe'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  // ─── Displays ─────────────────────────────────────────────────────────────

  ipcMain.handle('displays:getAll', () => {
    const primaryId = screen.getPrimaryDisplay().id
    const all = screen.getAllDisplays()

    // Sort: primary first, rest in original order
    const sorted = [
      ...all.filter(d => d.id === primaryId),
      ...all.filter(d => d.id !== primaryId)
    ]

    return sorted.map((d, i) => ({
      id: d.id,
      index: i + 1,
      isPrimary: d.id === primaryId,
      label: `Display ${i + 1} — ${d.bounds.width}×${d.bounds.height}${d.id === primaryId ? ' (Primary)' : ''}`,
      bounds: d.bounds,
      workArea: d.workArea
    }))
  })

  // ─── App ──────────────────────────────────────────────────────────────────

  ipcMain.handle('app:getVersions', () => ({
    app: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    osType: os.type()
  }))

  ipcMain.handle('app:openDataFolder', () => {
    shell.openPath(app.getPath('userData'))
  })

  ipcMain.handle('app:scanFeeds', async () => {
    const feeds = db.getFeeds()
    const results: Array<{ id: string; title: string; status: 'ok' | 'error'; error?: string }> = []
    
    for (const feed of feeds) {
      try {
        await robustParse(feed.url)
        results.push({ id: feed.id, title: feed.title, status: 'ok' })
      } catch (err) {
        results.push({ id: feed.id, title: feed.title, status: 'error', error: String(err) })
      }
    }
    return results
  })

  ipcMain.handle('app:cleanup', (_, days: number) => {
    db.cleanupOldArticles(days)
    return { ok: true }
  })

  ipcMain.handle('app:exportBackup', async (event) => {
    const win = event.sender ? BrowserWindow.fromWebContents(event.sender) : null
    const result = await dialog.showSaveDialog(win!, {
      title: 'Export Global Backup',
      defaultPath: 'cybersfeeds-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    const data = db.getBackupData()
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2))
    return { ok: true }
  })

  ipcMain.handle('app:importBackup', async (event) => {
    const win = event.sender ? BrowserWindow.fromWebContents(event.sender) : null
    const result = await dialog.showOpenDialog(win!, {
      title: 'Import Global Backup',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return { canceled: true }
    try {
      const content = fs.readFileSync(result.filePaths[0], 'utf-8')
      const data = JSON.parse(content)
      db.restoreBackupData(data)
      return { ok: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ─── Sound File Picker ───────────────────────────────────────────────────
  ipcMain.handle('notifications:pickSoundFile', async () => {
    const { BrowserWindow } = await import('electron')
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select Notification Sound',
      filters: [
        { name: 'Audio Files', extensions: ['wav', 'mp3', 'ogg'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // ─── Clipboard: copy remote image to clipboard ──────────────────────────
  ipcMain.handle('clipboard:copyImage', async (_, imageUrl?: string | null) => {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return { ok: false, error: 'no-image' }
    }
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(imageUrl, { signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) return { ok: false, error: `http-${res.status}` }
      const buf = Buffer.from(await res.arrayBuffer())
      const image = nativeImage.createFromBuffer(buf)
      if (image.isEmpty()) return { ok: false, error: 'empty-image' }
      clipboard.writeImage(image)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  // ─── Native Context Menu ─────────────────────────────────────────────────
  ipcMain.handle('showInputContextMenu', () => {
    const lang = db.getSettings().language || 'en'
    const t = translations[lang].mainProcess.webviewCtx
    const template: MenuItemConstructorOptions[] = [
      { role: 'cut', label: t.cut },
      { role: 'copy', label: t.copy },
      { role: 'paste', label: t.paste },
      { role: 'delete', label: t.delete },
      { type: 'separator' },
      { role: 'selectAll', label: t.selectAll }
    ]
    const menu = Menu.buildFromTemplate(template)
    menu.popup()
  })

  ipcMain.handle('showReadOnlyContextMenu', (_, linkUrl?: string, hasSelection?: boolean) => {
    const lang = db.getSettings().language || 'en'
    const t = translations[lang].mainProcess.webviewCtx
    const template: MenuItemConstructorOptions[] = []

    if (linkUrl) {
      template.push(
        {
          label: t.openLink,
          click: () => {
            const settings = db.getSettings()
            if (settings.customBrowserPath) {
              const { execFile } = require('child_process')
              execFile(settings.customBrowserPath, [linkUrl], (err) => {
                if (err) console.error('Failed to open custom browser:', err)
              })
            } else {
              shell.openExternal(linkUrl)
            }
          }
        },
        {
          label: t.copyLinkAddress,
          click: () => {
            const { clipboard } = require('electron')
            clipboard.writeText(linkUrl)
          }
        }
      )

      if (hasSelection) {
        template.push(
          { type: 'separator' },
          { role: 'copy', label: t.copy }
        )
      }
    } else if (hasSelection) {
      template.push({ role: 'copy', label: t.copy })
    }

    if (template.length > 0) {
      template.push({ type: 'separator' })
    }

    template.push(
      { role: 'selectAll', label: t.selectAll }
    )
    const menu = Menu.buildFromTemplate(template)
    menu.popup()
  })

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────────────

  ipcMain.handle('shortcuts:update', (_, shortcuts) => {
    const settings = db.getSettings()
    db.saveSettings({ ...settings, shortcuts })
    rebuildTrayMenu()
    rebuildGlobalShortcuts()
    return { ok: true }
  })

  ipcMain.handle('shortcuts:reset', () => {
    // Always read latest settings from DB; do not rely on cached defaults.
    const settings = db.getSettings()


    // Explicit reset payload to guarantee expected defaults even if the
    // main-process build has stale DEFAULT_SETTINGS cached.
    const RESET_SHORTCUTS = {
      showHide: { enabled: true, accelerator: 'Alt+Shift+S', global: true },
      notifications: { enabled: false, accelerator: '', global: false },
      settings: { enabled: false, accelerator: '', global: false },
      fetch: { enabled: false, accelerator: '', global: false }
    }

    // Overwrite shortcuts deterministically (avoid depending on current DB value shape/merge).
    // Also spreads DEFAULT_SETTINGS to guarantee we keep the rest of the app settings intact.
    db.saveSettings({
      ...DEFAULT_SETTINGS,
      ...settings,
      shortcuts: RESET_SHORTCUTS
    })

    rebuildTrayMenu()
    rebuildGlobalShortcuts()
    return { ok: true, shortcuts: RESET_SHORTCUTS }
  })

}
