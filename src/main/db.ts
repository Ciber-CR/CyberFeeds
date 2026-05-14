import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import type { Folder, Feed, Article, AppSettings, NotificationHistoryItem, WindowState } from './types'
import { DEFAULT_SETTINGS } from './types'

let db: Database.Database

export function initDb(): void {
  const dbPath = path.join(app.getPath('userData'), 'cybersfeeds.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -32000') // 32MB cache
  db.pragma('foreign_keys = ON')
  createSchema()
  migrate()
}

function migrate(): void {
  try { db.exec('ALTER TABLE articles ADD COLUMN thumbnail TEXT') } catch { /* already exists */ }
  try { db.exec('ALTER TABLE notification_history ADD COLUMN thumbnail TEXT') } catch { /* already exists */ }
}

function createSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      link TEXT,
      folderId TEXT NOT NULL DEFAULT '',
      icon TEXT,
      lastFetched INTEGER,
      errorCount INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      feedId TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      link TEXT NOT NULL DEFAULT '',
      pubDate INTEGER NOT NULL DEFAULT 0,
      content TEXT NOT NULL DEFAULT '',
      snippet TEXT NOT NULL DEFAULT '',
      author TEXT,
      thumbnail TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      starred INTEGER NOT NULL DEFAULT 0,
      guid TEXT NOT NULL,
      UNIQUE(guid),
      FOREIGN KEY (feedId) REFERENCES feeds(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_history (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT NOT NULL,
      feedName TEXT NOT NULL,
      icon TEXT,
      thumbnail TEXT,
      articleId TEXT,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS window_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      x INTEGER,
      y INTEGER,
      width INTEGER NOT NULL DEFAULT 1280,
      height INTEGER NOT NULL DEFAULT 800,
      maximized INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_articles_feed ON articles(feedId);
    CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(pubDate DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_unread ON articles(read, pubDate DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_starred ON articles(starred, pubDate DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_guid ON articles(guid);

    INSERT OR IGNORE INTO window_state (id, width, height, maximized) VALUES (1, 1280, 800, 0);
  `)

  // Seed default settings if empty
  const count = (db.prepare('SELECT COUNT(*) as c FROM settings').get() as { c: number }).c
  if (count === 0) {
    const settingsStr = JSON.stringify(DEFAULT_SETTINGS)
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app', settingsStr)
  }
}

// ─── Folders ───────────────────────────────────────────────────────────────

export function getFolders(): Folder[] {
  return db.prepare('SELECT * FROM folders ORDER BY sortOrder ASC').all() as Folder[]
}

export function addFolder(folder: Folder): void {
  db.prepare('INSERT INTO folders (id, name, sortOrder) VALUES (?, ?, ?)').run(
    folder.id, folder.name, folder.sortOrder
  )
}

export function updateFolder(id: string, name: string): void {
  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, id)
}

export function deleteFolder(id: string): void {
  db.transaction(() => {
    db.prepare("UPDATE feeds SET folderId = '' WHERE folderId = ?").run(id)
    db.prepare('DELETE FROM folders WHERE id = ?').run(id)
  })()
}

export function reorderFolders(ids: string[]): void {
  const stmt = db.prepare('UPDATE folders SET sortOrder = ? WHERE id = ?')
  db.transaction(() => {
    ids.forEach((id, i) => stmt.run(i, id))
  })()
}

// ─── Feeds ─────────────────────────────────────────────────────────────────

export function getFeeds(): Feed[] {
  return db.prepare('SELECT * FROM feeds ORDER BY title ASC').all() as Feed[]
}

export function addFeed(feed: Feed): void {
  db.prepare(`
    INSERT INTO feeds (id, title, url, link, folderId, icon, lastFetched, errorCount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(feed.id, feed.title, feed.url, feed.link ?? null, feed.folderId, feed.icon ?? null, feed.lastFetched ?? null, feed.errorCount)
}

export function updateFeed(feed: Partial<Feed> & { id: string }): void {
  const existing = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feed.id) as Feed
  if (!existing) return
  const merged = { ...existing, ...feed }
  db.prepare(`
    UPDATE feeds SET title=?, url=?, link=?, folderId=?, icon=?, lastFetched=?, errorCount=? WHERE id=?
  `).run(merged.title, merged.url, merged.link ?? null, merged.folderId, merged.icon ?? null, merged.lastFetched ?? null, merged.errorCount, merged.id)
}

export function deleteFeed(id: string): void {
  db.transaction(() => {
    db.prepare('DELETE FROM articles WHERE feedId = ?').run(id)
    db.prepare('DELETE FROM feeds WHERE id = ?').run(id)
  })()
}

export function getFeedById(id: string): Feed | undefined {
  return db.prepare('SELECT * FROM feeds WHERE id = ?').get(id) as Feed | undefined
}

/**
 * For every feed with no icon, derive a Google S2 favicon URL from the feed's
 * link/url and persist it. Called once on startup — SQLite only, no HTTP.
 * The browser will resolve the actual favicon images lazily.
 */
export function backfillFavicons(): void {
  const feeds = db.prepare('SELECT id, url, link FROM feeds WHERE icon IS NULL OR icon = ?').all('') as Feed[]
  if (feeds.length === 0) return

  const stmt = db.prepare('UPDATE feeds SET icon = ? WHERE id = ?')
  const update = db.transaction(() => {
    for (const feed of feeds) {
      try {
        const base = feed.link || feed.url
        const domain = new URL(base).hostname
        const icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
        stmt.run(icon, feed.id)
      } catch { /* skip invalid URLs */ }
    }
  })
  update()
  console.log(`[DB] Backfilled favicons for ${feeds.length} feeds`)
}

// ─── Articles ──────────────────────────────────────────────────────────────

export interface ArticleQuery {
  feedId?: string
  unreadOnly?: boolean
  starredOnly?: boolean
  search?: string
  limit?: number
  offset?: number
}

export function getArticles(query: ArticleQuery = {}): Article[] {
  const { feedId, unreadOnly, starredOnly, search, limit = 100, offset = 0 } = query
  let sql = `
    SELECT a.*, f.title as feedTitle, f.icon as feedIcon
    FROM articles a
    LEFT JOIN feeds f ON a.feedId = f.id
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (feedId) { sql += ' AND a.feedId = ?'; params.push(feedId) }
  if (unreadOnly) { sql += ' AND a.read = 0' }
  if (starredOnly) { sql += ' AND a.starred = 1' }
  if (search) {
    sql += ' AND (a.title LIKE ? OR a.snippet LIKE ? OR a.author LIKE ?)'
    const term = `%${search}%`
    params.push(term, term, term)
  }

  sql += ' ORDER BY a.pubDate DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  return db.prepare(sql).all(...params) as Article[]
}

export function getArticleCount(query: Omit<ArticleQuery, 'limit' | 'offset'> = {}): number {
  const { feedId, unreadOnly, starredOnly, search } = query
  let sql = 'SELECT COUNT(*) as c FROM articles a WHERE 1=1'
  const params: (string | number)[] = []
  if (feedId) { sql += ' AND a.feedId = ?'; params.push(feedId) }
  if (unreadOnly) { sql += ' AND a.read = 0' }
  if (starredOnly) { sql += ' AND a.starred = 1' }
  if (search) {
    sql += ' AND (a.title LIKE ? OR a.snippet LIKE ? OR a.author LIKE ?)'
    const term = `%${search}%`
    params.push(term, term, term)
  }
  return ((db.prepare(sql).get(...params) as { c: number }).c)
}

export function getUnreadCountByFeed(): Record<string, number> {
  const rows = db.prepare('SELECT feedId, COUNT(*) as c FROM articles WHERE read=0 GROUP BY feedId').all() as { feedId: string; c: number }[]
  const result = Object.fromEntries(rows.map(r => [r.feedId, r.c]))
  
  const starredRow = db.prepare('SELECT COUNT(*) as c FROM articles WHERE starred=1').get() as { c: number }
  result['starred'] = starredRow.c
  
  return result
}

export function insertArticles(articles: Omit<Article, 'feedTitle' | 'feedIcon'>[]): Omit<Article, 'feedTitle' | 'feedIcon'>[] {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO articles (id, feedId, title, link, pubDate, content, snippet, author, thumbnail, read, starred, guid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `)
  const inserted: Omit<Article, 'feedTitle' | 'feedIcon'>[] = []
  db.transaction(() => {
    for (const a of articles) {
      try {
        const result = stmt.run(a.id, a.feedId, a.title, a.link, a.pubDate, a.content, a.snippet, a.author ?? null, a.thumbnail ?? null, a.guid)
        if (result.changes > 0) inserted.push(a)
      } catch (err: any) {
        if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
          console.warn(`[DB] Skipping article ${a.id}: feed ${a.feedId} no longer exists`)
        } else {
          throw err
        }
      }
    }
  })()
  return inserted
}

export function markArticleRead(id: string, read: boolean): void {
  db.prepare('UPDATE articles SET read = ? WHERE id = ?').run(read ? 1 : 0, id)
}

export function deleteArticle(id: string): void {
  db.prepare('DELETE FROM articles WHERE id = ?').run(id)
}

export function markAllRead(feedId?: string): void {
  if (feedId) {
    db.prepare('UPDATE articles SET read = 1 WHERE feedId = ?').run(feedId)
  } else {
    db.prepare('UPDATE articles SET read = 1').run()
  }
}

export function starArticle(id: string, starred: boolean): void {
  db.prepare('UPDATE articles SET starred = ? WHERE id = ?').run(starred ? 1 : 0, id)
}

export function getArticleById(id: string): Article | undefined {
  return db.prepare(`
    SELECT a.*, f.title as feedTitle, f.icon as feedIcon
    FROM articles a LEFT JOIN feeds f ON a.feedId = f.id
    WHERE a.id = ?
  `).get(id) as Article | undefined
}

export function cleanupOldArticles(days: number): void {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  db.prepare('DELETE FROM articles WHERE read = 1 AND starred = 0 AND pubDate < ?').run(cutoff)
}

export function getTodayArticles(): Article[] {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  return db.prepare(`
    SELECT a.*, f.title as feedTitle, f.icon as feedIcon
    FROM articles a LEFT JOIN feeds f ON a.feedId = f.id
    WHERE a.pubDate >= ?
    ORDER BY a.pubDate DESC
  `).all(startOfDay.getTime()) as Article[]
}

// ─── Notification History ──────────────────────────────────────────────────

export function getNotificationHistory(limit = 200): NotificationHistoryItem[] {
  return db.prepare('SELECT * FROM notification_history ORDER BY createdAt DESC LIMIT ?').all(limit) as NotificationHistoryItem[]
}

export function addNotificationHistory(item: NotificationHistoryItem): void {
  db.prepare(`
    INSERT OR REPLACE INTO notification_history (id, title, body, link, feedName, icon, thumbnail, articleId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(item.id, item.title, item.body, item.link, item.feedName, item.icon ?? null, item.thumbnail ?? null, item.articleId ?? null, item.createdAt)
  // Keep only last 200
  db.prepare(`
    DELETE FROM notification_history WHERE id NOT IN (
      SELECT id FROM notification_history ORDER BY createdAt DESC LIMIT 200
    )
  `).run()
}

export function clearNotificationHistory(): void {
  db.prepare('DELETE FROM notification_history').run()
}

// ─── Settings ──────────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('app') as { value: string } | undefined
  if (!row) return DEFAULT_SETTINGS
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('app', JSON.stringify(settings))
}

// ─── Window State ──────────────────────────────────────────────────────────

export function getWindowState(): WindowState {
  const row = db.prepare('SELECT * FROM window_state WHERE id = 1').get() as any
  if (!row) return { width: 1280, height: 800, maximized: true }
  return { ...row, maximized: row.maximized === 1 }
}

export function saveWindowState(state: WindowState): void {
  db.prepare(`
    UPDATE window_state SET x=?, y=?, width=?, height=?, maximized=? WHERE id=1
  `).run(state.x ?? null, state.y ?? null, state.width, state.height, state.maximized ? 1 : 0)
}

export function getDb(): Database.Database {
  return db
}

// ─── Backup & Restore ──────────────────────────────────────────────────────

export function getBackupData(): any {
  return {
    version: 1,
    settings: getSettings(),
    folders: getFolders(),
    feeds: getFeeds(),
    starredArticles: db.prepare('SELECT * FROM articles WHERE starred = 1').all()
  }
}

export function restoreBackupData(data: any): void {
  db.transaction(() => {
    // Clear current data
    db.prepare('DELETE FROM feeds').run()
    db.prepare('DELETE FROM folders').run()
    db.prepare('DELETE FROM articles').run()

    // Restore folders
    if (Array.isArray(data.folders)) {
      for (const f of data.folders) {
        db.prepare('INSERT INTO folders (id, name, sortOrder) VALUES (?, ?, ?)').run(f.id, f.name, f.sortOrder)
      }
    }

    // Restore feeds
    if (Array.isArray(data.feeds)) {
      for (const f of data.feeds) {
        db.prepare(`
          INSERT INTO feeds (id, title, url, link, folderId, icon, lastFetched, errorCount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(f.id, f.title, f.url, f.link, f.folderId, f.icon, f.lastFetched, f.errorCount)
      }
    }

    // Restore starred articles
    if (Array.isArray(data.starredArticles)) {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO articles (id, feedId, title, link, pubDate, content, snippet, author, thumbnail, read, starred, guid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const a of data.starredArticles) {
        stmt.run(a.id, a.feedId, a.title, a.link, a.pubDate, a.content, a.snippet, a.author, a.thumbnail, a.read, a.starred, a.guid)
      }
    }

    // Restore settings
    if (data.settings) {
      saveSettings(data.settings)
    }
  })()
}
