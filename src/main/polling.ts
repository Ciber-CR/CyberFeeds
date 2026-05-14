import { Worker } from 'worker_threads'
import path from 'path'
import { app } from 'electron'
import * as db from './db'
import type { Feed } from './types'

let pollingTimer: ReturnType<typeof setInterval> | null = null
let isPolling = false
let pendingPoll = false
let onNewArticlesCallback: ((feedId: string, insertedArticles: any[], feedTitle: string, feedIcon?: string) => void) | null = null

export function setOnNewArticles(cb: (feedId: string, insertedArticles: any[], feedTitle: string, feedIcon?: string) => void): void {
  onNewArticlesCallback = cb
}

function getWorkerPath(): string {
  // In dev: out/main/feed-fetcher.worker.js (electron-vite builds it)
  // In prod: same location relative to app
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar', 'out', 'main', 'feed-fetcher.worker.js')
  }
  return path.join(app.getAppPath(), 'out', 'main', 'feed-fetcher.worker.js')
}

export async function pollFeeds(feeds?: Feed[]): Promise<void> {
  if (isPolling) {
    pendingPoll = true
    return
  }
  isPolling = true
  pendingPoll = false

  const feedsToFetch = feeds || db.getFeeds()
  if (feedsToFetch.length === 0) {
    isPolling = false
    return
  }

  const workerPath = getWorkerPath()
  const worker = new Worker(workerPath, {
    workerData: {
      feeds: feedsToFetch.map(f => ({ id: f.id, url: f.url })),
      concurrency: 5
    }
  })

  worker.on('message', (result: { feedId: string; articles: any[]; error?: string; lastFetched: number; done?: boolean }) => {
    if (result.done) {
      isPolling = false
      worker.terminate()
      if (pendingPoll) {
        pollFeeds()
      }
      return
    }

    const { feedId, articles, error, lastFetched } = result

    if (error) {
      // Increment error count
      const feed = db.getFeedById(feedId)
      if (feed) {
        db.updateFeed({ id: feedId, errorCount: (feed.errorCount || 0) + 1, lastFetched })
      }
      return
    }

    // Reset error count on success
    db.updateFeed({ id: feedId, errorCount: 0, lastFetched })

    if (articles.length > 0) {
      const inserted = db.insertArticles(articles)
      if (inserted.length > 0 && onNewArticlesCallback) {
        const feed = db.getFeedById(feedId)
        onNewArticlesCallback(feedId, inserted, feed?.title || '', feed?.icon || undefined)
      }
    }
  })

  worker.on('error', (err) => {
    console.error('[Polling] Worker error:', err)
    isPolling = false
    if (pendingPoll) {
      pollFeeds()
    }
  })

  worker.on('exit', () => {
    isPolling = false
    if (pendingPoll) {
      pollFeeds()
    }
  })
}

export function startPolling(intervalMinutes: number): void {
  stopPolling()
  pollFeeds() // immediate first poll
  pollingTimer = setInterval(() => pollFeeds(), intervalMinutes * 60 * 1000)
}

export function stopPolling(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

export function restartPolling(intervalMinutes: number): void {
  stopPolling()
  startPolling(intervalMinutes)
}
