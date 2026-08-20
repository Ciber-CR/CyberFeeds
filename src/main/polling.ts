import { Worker } from 'worker_threads'
import path from 'path'
import { app, BrowserWindow } from 'electron'
import * as db from './db'
import type { Feed } from './types'
import { setTrayActivity } from './tray'
import { setPollingBatchHold } from './notifications'

let pollingTimer: ReturnType<typeof setInterval> | null = null
let startupPollTimer: ReturnType<typeof setTimeout> | null = null
let isPolling = false
let pendingPoll = false
let pollWatchdog: ReturnType<typeof setTimeout> | null = null

const POLL_WATCHDOG_MS = 5 * 60 * 1000 // 5 minutes

function clearWatchdog(): void {
  if (pollWatchdog) {
    clearTimeout(pollWatchdog)
    pollWatchdog = null
  }
}
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

export async function pollFeeds(feeds?: Feed[], onComplete?: () => void): Promise<void> {
  if (isPolling) {
    pendingPoll = true
    return
  }
  isPolling = true
  pendingPoll = false

  const settings = db.getSettings()
  if (!settings.pollingEnabled && !feeds) {
    console.log('[Polling] Automatic polling is globally disabled, skipping cycle.')
    isPolling = false
    onComplete?.()
    return
  }

  if (!feeds && settings.pollOnlyWhenUnfocused) {
    const windows = BrowserWindow.getAllWindows()
    const isAppFocused = windows.some(w => !w.isDestroyed() && w.isFocused())
    if (isAppFocused) {
      console.log('[Polling] Application is currently focused and pollOnlyWhenUnfocused is enabled, skipping background poll cycle.')
      isPolling = false
      onComplete?.()
      return
    }
  }

  const feedsToFetch = feeds || db.getFeeds().filter(f => !f.disabled)
  console.log(`[Polling] Starting poll cycle for ${feedsToFetch.length} feeds (Manual: ${!!feeds})`)

  if (feedsToFetch.length === 0) {
    console.log('[Polling] No feeds to fetch, stopping cycle.')
    isPolling = false
    onComplete?.()
    return
  }

  setTrayActivity('polling', true)
  setPollingBatchHold(true)

  const workerPath = getWorkerPath()
  const worker = new Worker(workerPath, {
    workerData: {
      feeds: feedsToFetch.map(f => ({ id: f.id, url: f.url })),
      concurrency: 5
    }
  })
  let completed = false
  const complete = (): void => {
    if (completed) return
    completed = true
    setTrayActivity('polling', false)
    setPollingBatchHold(false)
    onComplete?.()
  }

  clearWatchdog()
  pollWatchdog = setTimeout(() => {
    console.error(`[Polling] Watchdog triggered — worker did not complete within ${POLL_WATCHDOG_MS / 1000}s, terminating`)
    worker.terminate()
    isPolling = false
    complete()
    if (pendingPoll) {
      pollFeeds()
    }
  }, POLL_WATCHDOG_MS)

  worker.on('message', (result: { feedId: string; articles: any[]; error?: string; lastFetched: number; done?: boolean }) => {
    if (result.done) {
      console.log('[Polling] Cycle complete.')
      clearWatchdog()
      isPolling = false
      worker.terminate()
      // Auto cleanup after poll cycle
      const settings = db.getSettings()
      if (settings.autoCleanup && settings.cleanupReadDays > 0) {
        try {
          console.log(`[Polling] Running auto-cleanup (days: ${settings.cleanupReadDays})`)
          db.cleanupOldArticles(settings.cleanupReadDays)
        } catch (err) {
          console.error('[Polling] Cleanup error:', err)
        }
      }
      try {
        db.purgeOldTrash(db.TRASH_RETENTION_DAYS)
      } catch (err) {
        console.error('[Polling] Trash cleanup error:', err)
      }
      complete()
      if (pendingPoll) {
        console.log('[Polling] Starting pending poll...')
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
      console.log(`[Polling] Feed ${feedId}: ${articles.length} found, ${inserted.length} new.`)
      if (inserted.length > 0 && onNewArticlesCallback) {
        const feed = db.getFeedById(feedId)
        onNewArticlesCallback(feedId, inserted, feed?.title || '', feed?.icon || undefined)
      }
    } else {
      console.log(`[Polling] Feed ${feedId}: No articles found.`)
    }
  })

  worker.on('error', (err) => {
    clearWatchdog()
    console.error('[Polling] Worker error:', err)
    isPolling = false
    complete()
    if (pendingPoll) {
      pollFeeds()
    }
  })

  worker.on('exit', () => {
    clearWatchdog()
    isPolling = false
    complete()
    if (pendingPoll) {
      pollFeeds()
    }
  })
}

/**
 * Wait for an explicit/manual poll to finish, including any poll already in
 * progress. `pollFeeds` remains fire-and-forget for scheduled polling, while
 * UI actions need an accurate completion boundary.
 */
export function pollFeedsAndWait(feeds?: Feed[]): Promise<void> {
  return new Promise((resolve) => {
    const startWhenIdle = (): void => {
      if (isPolling) {
        setTimeout(startWhenIdle, 50)
        return
      }
      void pollFeeds(feeds, resolve)
    }
    startWhenIdle()
  })
}

export function startPolling(intervalMinutes: number, isInitialStartup = false): void {
  stopPolling()
  const settings = db.getSettings()
  const interval = Math.max(1, isNaN(intervalMinutes) ? 15 : intervalMinutes)
  console.log(`[Polling] Initializing background polling every ${interval} minutes. (Startup: ${isInitialStartup})`)
  
  if (isInitialStartup) {
    if (settings.fetchOnStartup !== false) {
      const delaySec = typeof settings.fetchOnStartupDelay === 'number' ? settings.fetchOnStartupDelay : 15
      if (delaySec > 0) {
        console.log(`[Polling] Scheduling initial startup poll in ${delaySec}s...`)
        startupPollTimer = setTimeout(() => {
          startupPollTimer = null
          pollFeeds()
        }, delaySec * 1000)
      } else {
        pollFeeds()
      }
    } else {
      console.log('[Polling] Initial startup poll is disabled by user setting.')
    }
  }
  
  pollingTimer = setInterval(() => {
    console.log('[Polling] Interval triggered.')
    pollFeeds()
  }, interval * 60 * 1000)
}

export function stopPolling(): void {
  if (startupPollTimer) {
    clearTimeout(startupPollTimer)
    startupPollTimer = null
  }
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

export function restartPolling(intervalMinutes: number): void {
  stopPolling()
  startPolling(intervalMinutes, false)
}
