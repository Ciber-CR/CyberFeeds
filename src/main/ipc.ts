import { ipcMain, shell, dialog, screen, Menu, MenuItemConstructorOptions, BrowserWindow } from 'electron'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { Worker } from 'worker_threads'
import { app } from 'electron'
import * as db from './db'
import * as polling from './polling'
import { importOpml, exportOpml } from './opml'
import { updateNotifierSettings } from './notifications'
import { setAutoUpdate } from './updater'
import type { Feed, Folder } from './types'
import RssParser from 'rss-parser'
import { XMLParser } from 'fast-xml-parser'

const rssParser = new RssParser({ timeout: 10000 })

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

async function robustParse(url: string): Promise<any> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, text/html, */*'
  }

  try {
    return await rssParser.parseURL(url)
  } catch (err) {
    console.error(`Standard RSS parsing failed for ${url}, trying robust fallback...`, err)
    
    // Manual fetch
    const resp = await fetch(url, { headers })
    if (!resp.ok) throw err 
    let text = await resp.text()

    // ─── Auto-Discovery ───────────────────────────────────────────────────
    // If it's HTML, try to find a real RSS link
    if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html')) {
      console.log(`[Discovery] HTML detected at ${url}, searching for RSS links...`)
      const rssLinkMatch = text.match(/<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(rss\+xml|atom\+xml)["'][^>]+href=["']([^"']+)["']/i) ||
                           text.match(/<link[^>]+type=["']application\/(rss\+xml|atom\+xml)["'][^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i) ||
                           text.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']alternate["'][^>]+type=["']application\/(rss\+xml|atom\+xml)["']/i)
      
      if (rssLinkMatch && rssLinkMatch[2]) {
        let discoveredUrl = rssLinkMatch[2]
        if (!discoveredUrl.startsWith('http')) {
          const baseUrl = new URL(url)
          discoveredUrl = new URL(discoveredUrl, baseUrl.origin).href
        }
        console.log(`[Discovery] Found RSS link: ${discoveredUrl}, fetching...`)
        const subResp = await fetch(discoveredUrl, { headers })
        if (subResp.ok) {
          text = await subResp.text()
        }
      } else {
        // Heuristic fallback for common CMS patterns (like Teletica)
        const lowerUrl = url.toLowerCase()
        if (lowerUrl.endsWith('/rss') || lowerUrl.endsWith('/rss/')) {
          const guessUrl = lowerUrl.endsWith('/') ? `${url}feed` : `${url}/feed`
          console.log(`[Discovery] Guessing feed URL: ${guessUrl}`)
          const guessResp = await fetch(guessUrl, { headers })
          if (guessResp.ok) {
            text = await guessResp.text()
          }
        }
      }
    }

    const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    const parsed = xmlParser.parse(text)
    
    // Check if it's RSS (channel) or Atom (feed)
    const channel = parsed.rss?.channel || parsed.feed || parsed
    const channelTitle = channel.title?.['#text'] || channel.title || url
    const channelDesc = channel.description || channel.subtitle || ''
    
    const extractLinkString = (linkObj: any): string => {
      if (!linkObj) return ''
      if (typeof linkObj === 'string') return linkObj
      if (Array.isArray(linkObj)) {
        const alt = linkObj.find(l => l['@_rel'] === 'alternate') || linkObj[0]
        return extractLinkString(alt)
      }
      return linkObj['@_href'] || linkObj['#text'] || ''
    }

    const channelLink = extractLinkString(channel.link)

    const rawItems = Array.isArray(channel.item) ? channel.item : 
                     Array.isArray(channel.entry) ? channel.entry : 
                     channel.item ? [channel.item] : 
                     channel.entry ? [channel.entry] : []
    
    const items = rawItems.map((item: any) => {
      const title = item.title?.['#text'] || item.title || 'Untitled'
      const link = extractLinkString(item.link)
      const content = item['content:encoded'] || item.content?.['#text'] || item.content || item.description || ''
      const pubDate = item.pubDate || item.published || item.updated || ''
      const guid = item.guid?.['#text'] || item.guid || item.id || link

      return { title, link, content, pubDate, guid, isoDate: pubDate }
    })

    if (items.length === 0) {
      if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error('The URL provided is a webpage, not an RSS feed. Please provide the exact RSS feed URL.')
      }
      throw err
    }

    return {
      title: channelTitle,
      description: channelDesc,
      link: channelLink,
      items
    }
  }
}

export function registerIpc(): void {
  // ─── Feeds ───────────────────────────────────────────────────────────────

  ipcMain.handle('feeds:getAll', () => db.getFeeds())

  ipcMain.handle('feeds:add', async (_, url: string, folderId: string, customTitle?: string) => {
    try {
      // Normalize URL
      let normalizedUrl = url.trim()
      if (!normalizedUrl.startsWith('http')) normalizedUrl = 'https://' + normalizedUrl

      // Check for duplicate
      const existing = db.getFeeds().find(f => f.url === normalizedUrl)
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
      return { error: String(err) }
    }
  })

  ipcMain.handle('feeds:preview', async (_, url: string) => {
    try {
      let normalizedUrl = url.trim()
      if (!normalizedUrl.startsWith('http')) normalizedUrl = 'https://' + normalizedUrl
      const parsed = await robustParse(normalizedUrl)
      return {
        title: parsed.title,
        description: parsed.description,
        link: parsed.link,
        items: (parsed.items || []).slice(0, 5).map(i => ({ title: i.title, pubDate: i.pubDate, link: i.link }))
      }
    } catch (err) {
      return { error: String(err) }
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
    db.saveSettings(settings)
    updateNotifierSettings(settings.notifications)
    if (settings.pollingInterval !== current.pollingInterval) {
      polling.restartPolling(settings.pollingInterval)
    }

    // Auto-start
    setAutoStart(settings.autoStart, settings.startMinimized)

    // Auto-update toggle
    setAutoUpdate(settings.autoUpdate)

    return { ok: true }
  })

  // ─── Notification History ─────────────────────────────────────────────────

  ipcMain.handle('notifications:getHistory', () => db.getNotificationHistory())

  ipcMain.handle('notifications:clearHistory', () => {
    db.clearNotificationHistory()
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
    node: process.versions.node
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
      return { error: String(err) }
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

  // ─── Native Context Menu ─────────────────────────────────────────────────
  ipcMain.handle('showInputContextMenu', () => {
    const template: MenuItemConstructorOptions[] = [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'delete' },
      { type: 'separator' },
      { role: 'selectAll' }
    ]
    const menu = Menu.buildFromTemplate(template)
    menu.popup()
  })

  ipcMain.handle('showReadOnlyContextMenu', () => {
    const template: MenuItemConstructorOptions[] = [
      { role: 'copy' },
      { type: 'separator' },
      { role: 'selectAll' }
    ]
    const menu = Menu.buildFromTemplate(template)
    menu.popup()
  })
}
