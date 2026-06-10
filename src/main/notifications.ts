import { BrowserWindow, screen, ipcMain, shell, app } from 'electron'
import path from 'path'
import url from 'url'
import fs from 'fs'
import { is } from '@electron-toolkit/utils'
import * as db from './db'
import { restoreMainWindow } from './index'
import type { NotificationHistoryItem, NotificationSettings } from './types'

let notifierWindow: BrowserWindow | null = null
const displayStack: NotificationHistoryItem[] = []
let hideTimer: ReturnType<typeof setTimeout> | null = null
let settings: NotificationSettings
let lastSoundTime = 0
let isHovering = false

// Pixel height of each notification card (content + gap)
const CARD_H = 140
const THUMB_H = 102 // 100px img + 2px margin-bottom
const CARD_GAP = 6
const CLEAR_BAR_H = 36
const WIN_PAD = 12
const HARD_CAP = 50
// Extra width reserved for the scrollbar so action buttons aren't cramped/clipped
// when the stack overflows and the scrollbar appears.
const SCROLLBAR_W = 16

export function initNotifier(s: NotificationSettings): void {
  settings = s
  try {
    if (settings.displayBounds) {
      const displays = screen.getAllDisplays()
      const saved = settings.displayBounds
      const matched = displays.find(d =>
        d.bounds.x === saved.x &&
        d.bounds.y === saved.y &&
        d.bounds.width === saved.width &&
        d.bounds.height === saved.height
      )
      if (matched && matched.id !== settings.displayId) {
        console.log(`[Notifier] Startup auto-align: updating displayId from ${settings.displayId} to ${matched.id}`)
        settings.displayId = matched.id
        db.saveSettings({
          ...db.getSettings(),
          notifications: settings
        })
      }
    }
  } catch (err) {
    console.error('[Notifier] Failed to auto-align display ID on startup:', err)
  }
}
export function updateNotifierSettings(s: NotificationSettings): void {
  settings = s
  if (notifierWindow && !notifierWindow.isDestroyed() && notifierWindow.isVisible()) {
    applyPositionToWindow(notifierWindow, displayStack.length, settings)
  }
}

/**
 * Calculate (x, y) for the notifier window given EXPLICIT width+height.
 * Never reads win.getBounds() — avoids Windows timing lag after setSize().
 */
function calcPosition(
  winW: number,
  winH: number,
  s: NotificationSettings
): { x: number; y: number } {
  const displays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()

  let display: any = null

  // 1. Try to match by saved bounds first (most stable across reboots/hotplugs)
  if (s.displayBounds) {
    const saved = s.displayBounds
    display = displays.find(d =>
      d.bounds.x === saved.x &&
      d.bounds.y === saved.y &&
      d.bounds.width === saved.width &&
      d.bounds.height === saved.height
    )
    if (display) {
      // Auto-align setting if ID changed mid-run
      if (display.id !== s.displayId) {
        console.log(`[Notifier] Display ID changed mid-run from ${s.displayId} to ${display.id}, updating settings`)
        s.displayId = display.id
        db.saveSettings({
          ...db.getSettings(),
          notifications: s
        })
      }
    }
  }

  // 2. Fallback to ID
  if (!display) {
    display = displays.find(d => d.id === s.displayId)
  }

  // 3. Fallback to primary display
  if (!display) {
    console.warn(`[Notifier] Display ${s.displayId} not found, falling back to primary`)
    display = primaryDisplay
  }

  const { workArea: wa } = display
  const mx = Math.round(s.marginX)
  const my = Math.round(s.marginY)

  const map: Record<string, { x: number; y: number }> = {
    'top-left':      { x: wa.x + mx,                              y: wa.y + my },
    'top-center':    { x: wa.x + Math.round((wa.width - winW) / 2), y: wa.y + my },
    'top-right':     { x: wa.x + wa.width  - winW - mx,           y: wa.y + my },
    'bottom-left':   { x: wa.x + mx,                              y: wa.y + wa.height - winH - my },
    'bottom-center': { x: wa.x + Math.round((wa.width - winW) / 2), y: wa.y + wa.height - winH - my },
    'bottom-right':  { x: wa.x + wa.width  - winW - mx,           y: wa.y + wa.height - winH - my }
  }

  const p = map[s.position] ?? map['bottom-right']
  return { x: Math.round(p.x), y: Math.round(p.y) }
}

/** Resize window to fit N cards (capped at maxStack), then place it correctly. */
function applyPositionToWindow(
  win: BrowserWindow,
  cardCount: number,
  s: NotificationSettings
): void {
  const winW = s.maxWidth + (cardCount > s.maxStack ? SCROLLBAR_W : 0)
  const visibleCards = Math.min(Math.max(1, cardCount), s.maxStack)
  const clearBar = cardCount > 0 ? CLEAR_BAR_H : 0
  const gaps = Math.max(0, visibleCards - 1) * CARD_GAP
  const visible = displayStack.slice(0, visibleCards)
  const thumbCount = s.showThumbnails ? visible.filter(n => n.thumbnail).length : 0
  const winH = visibleCards * CARD_H + thumbCount * THUMB_H + gaps + WIN_PAD + clearBar

  const { x, y } = calcPosition(winW, winH, s)
  // Atomic update of position and size to avoid Windows-specific lag/flicker
  win.setBounds({ x, y, width: winW, height: winH }, false)
}

function createNotifierWindow(s: NotificationSettings): BrowserWindow {
  const win = new BrowserWindow({
    width: s.maxWidth,
    height: CARD_H + CLEAR_BAR_H + WIN_PAD, // 1 card + clear bar
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  })

  win.setIgnoreMouseEvents(false)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/notifier/index.html`)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/notifier/index.html'))
  }

  win.on('closed', () => { notifierWindow = null })
  return win
}

function ensureWindow(): BrowserWindow {
  if (!notifierWindow || notifierWindow.isDestroyed()) {
    notifierWindow = createNotifierWindow(settings)
  }
  return notifierWindow
}

/** Push current stack to the notifier window, size & position it, show if hidden. */
let isPushing = false
async function pushToWindow(s: NotificationSettings = settings): Promise<void> {
  if (displayStack.length === 0) return
  if (isPushing) return // Avoid re-entry if multiple notifications arrive fast
  
  isPushing = true
  try {
    const win = ensureWindow()

    // Wait for renderer to be ready if window is still loading
    if (win.webContents.isLoading()) {
      console.log('[Notifier] Window is loading, waiting...')
      await new Promise<void>((resolve) => {
        win.webContents.once('did-finish-load', resolve)
        setTimeout(resolve, 2000) // Safety fallback
      })
    }

    if (win.isDestroyed()) return

    console.log(`[Notifier] Pushing stack (size: ${displayStack.length}) to window`)

    // 1. Resize + reposition with EXPLICIT sizes
    applyPositionToWindow(win, displayStack.length, s)

    // 2. Send stack to renderer
    win.webContents.send('notifier:stack', displayStack, s, db.getSettings().language || 'en', db.getUnseenNotificationCount())

    // 3. Re-apply alwaysOnTop to ensure window stays in foreground
    //    (Windows can demote z-order after repeated hide/show cycles)
    win.setAlwaysOnTop(true, 'screen-saver')

    // 4. Show
    if (!win.isVisible()) {
      console.log('[Notifier] Showing window (showInactive)')
      win.showInactive()
    }

    // 5. Auto-hide
    if (hideTimer) clearTimeout(hideTimer)
    if (!isHovering) {
      hideTimer = setTimeout(() => {
        if (notifierWindow && !notifierWindow.isDestroyed()) {
          console.log('[Notifier] Auto-hiding window')
          notifierWindow.hide()
          displayStack.length = 0
        }
      }, s.duration + 500)
    }
  } finally {
    isPushing = false
  }
}

function playNotificationSound(s: NotificationSettings): void {
  if (s.soundEnabled === false) {
    console.log('[Notifier] Sound is disabled')
    return
  }

  // Determine path to play
  let playPath = s.soundFile
  
  let defaultMp3 = path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'CyberFeeds.mp3')
  if (!fs.existsSync(defaultMp3)) {
    defaultMp3 = path.join(app.getAppPath(), 'resources', 'CyberFeeds.mp3')
  }
  if (!fs.existsSync(defaultMp3)) {
    defaultMp3 = 'C:\\CyberGems\\CyberFeeds\\CyberFeeds.mp3'
  }

  if (!playPath) {
    if (fs.existsSync(defaultMp3)) {
      playPath = defaultMp3
    }
  }

  if (playPath) {
    console.log(`[Notifier] Playing sound: ${playPath}`)
    try {
      const win = ensureWindow()
      const encoded = url.pathToFileURL(playPath).toString()
      console.log(`[Notifier] Executing JS to play: ${encoded}`)
      win.webContents.executeJavaScript(
        `(function(){ 
          console.log('Attempting to play sound: ${encoded}');
          var a = new Audio('${encoded}'); 
          a.volume = 0.7; 
          a.play().then(() => console.log('Sound played successfully'))
                  .catch(e => console.error('Sound play failed:', e)); 
        })()`
      ).catch(err => console.error('[Notifier] JS execution failed:', err))
    } catch (err) {
      console.error('[Notifier] Error playing sound:', err)
    }
  } else {
    console.log('[Notifier] Playing system beep')
    shell.beep()
  }
}

export function showNotification(item: NotificationHistoryItem): void {
  console.log(`[Notifier] showNotification triggered for: ${item.title}`)
  if (!settings.enabled) {
    console.warn('[Notifier] Notification suppressed: notifications are disabled')
    return
  }
  if (settings.snoozedUntil && Date.now() < settings.snoozedUntil) {
    console.warn('[Notifier] Notification suppressed: snoozed until', new Date(settings.snoozedUntil).toISOString())
    return
  }
  if (settings.feedFilters.includes(item.feedId || '')) {
    console.warn(`[Notifier] Notification suppressed: feed ${item.feedId} is filtered`)
    return
  }

  const combined = `${item.title} ${item.body}`.toLowerCase()
  if (settings.keywordFilters.some(kw => combined.includes(kw.toLowerCase()))) {
    console.warn('[Notifier] Notification suppressed: matched keyword filter')
    return
  }

  // History + badge + sound fire immediately; only the popup card waits on the image.
  db.addNotificationHistory(item)

  if (Date.now() - lastSoundTime > 60_000) {
    playNotificationSound(settings)
    lastSoundTime = Date.now()
  }

  const mainWin = BrowserWindow.getAllWindows().find(w => w !== notifierWindow)
  if (mainWin) {
    mainWin.webContents.send('notifications:new', item)
  }

  void presentInPopup(item)
}

/**
 * Push a notification into the popup stack. When image preloading is enabled,
 * the card is held back until its thumbnail is fully fetched (as a data URL),
 * so the card never appears with an empty/half-loaded image container.
 */
async function presentInPopup(item: NotificationHistoryItem): Promise<void> {
  const displayItem: NotificationHistoryItem = { ...item }

  if (settings.showThumbnails && settings.preloadImages !== false && displayItem.thumbnail) {
    const dataUrl = await preloadImageDataUrl(displayItem.thumbnail)
    // On success render the painted image instantly; on failure fall back to the
    // original URL (better a late lazy-load than suppressing the card forever).
    if (dataUrl) displayItem.thumbnail = dataUrl
  }

  displayStack.push(displayItem)
  // Hard cap to prevent unbounded memory growth
  if (displayStack.length > HARD_CAP) displayStack.splice(0, displayStack.length - HARD_CAP)

  pushToWindow()
}

/**
 * Fetch a remote image and return it as a base64 data URL so the renderer can
 * paint it with no network round-trip. Returns null on any failure/timeout or
 * if the source isn't a remote http(s) image.
 */
async function preloadImageDataUrl(src: string, timeoutMs = 6000): Promise<string | null> {
  if (!/^https?:\/\//i.test(src)) return null // already data:/relative — nothing to preload
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(src, { signal: controller.signal })
    if (!res.ok) return null
    const type = res.headers.get('content-type') || 'image/jpeg'
    if (!type.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0 || buf.length > 8 * 1024 * 1024) return null // skip empty/oversized
    return `data:${type};base64,${buf.toString('base64')}`
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export function registerNotifierIpc(): void {
  ipcMain.on('notifier:dismiss', (_, id: string) => {
    const idx = displayStack.findIndex(n => n.id === id)
    if (idx !== -1) displayStack.splice(idx, 1)
    if (displayStack.length === 0) {
      notifierWindow?.hide()
    } else {
      pushToWindow()
    }
  })

  ipcMain.on('notifier:clearAll', () => {
    displayStack.length = 0
    notifierWindow?.hide()
  })

  ipcMain.on('notifier:markRead', (_, articleId: string) => {
    if (articleId) db.markArticleRead(articleId, true)
  })

  ipcMain.on('notifier:snooze', (_, minutes: number) => {
    settings = { ...settings, snoozedUntil: Date.now() + minutes * 60_000 }
    db.saveSettings({ ...db.getSettings(), notifications: settings })
    displayStack.length = 0
    notifierWindow?.hide()
  })

  ipcMain.on('notifier:openInApp', (_, feedId: string, articleId: string) => {
    notifierWindow?.hide()
    const mainWin = BrowserWindow.getAllWindows().find(w => w !== notifierWindow)
    if (mainWin) {
      restoreMainWindow()
      mainWin.webContents.send('app:openArticle', { feedId, articleId })
    }
  })

  ipcMain.on('notifier:openHistory', () => {
    notifierWindow?.hide()
    const mainWin = BrowserWindow.getAllWindows().find(w => w !== notifierWindow)
    if (mainWin) {
      restoreMainWindow()
      mainWin.webContents.send('app:openHistory')
    }
  })

  ipcMain.on('notifier:hover', (_, hovering: boolean) => {
    isHovering = hovering
    if (isHovering) {
      if (hideTimer) clearTimeout(hideTimer)
    } else {
      if (displayStack.length > 0) {
        if (hideTimer) clearTimeout(hideTimer)
        hideTimer = setTimeout(() => {
          if (notifierWindow && !notifierWindow.isDestroyed()) {
            notifierWindow.hide()
            displayStack.length = 0
          }
        }, settings.duration + 500)
      }
    }
  })

  /**
   * Preview handler.
   * Accepts OPTIONAL notification settings from the renderer (the UI's local state),
   * so the preview reflects what the user currently has typed — even before Save.
   */
  ipcMain.handle('notifier:preview', async (_, tempNotifSettings?: NotificationSettings) => {
    try {
      // Use temp settings from UI if provided, fall back to saved settings
      const effectiveSettings: NotificationSettings = tempNotifSettings
        ? { ...settings, ...tempNotifSettings }
        : settings

      const win = ensureWindow()

      // Wait for renderer to be ready if window just opened
      await new Promise<void>(resolve => {
        if (!win.webContents.isLoading()) { resolve(); return }
        win.webContents.once('did-finish-load', resolve)
        setTimeout(resolve, 1500)
      })

      const previewItem: NotificationHistoryItem = {
        id: 'preview-' + Date.now(),
        title: 'CyberFeeds — Notification Preview',
        body: 'Your notifications will appear like this.',
        link: '',
        feedName: 'CyberFeeds',
        createdAt: Date.now()
      }

      displayStack.unshift(previewItem)
      if (displayStack.length > effectiveSettings.maxStack) displayStack.length = effectiveSettings.maxStack

      // Push with effective (possibly unsaved) settings
      pushToWindow(effectiveSettings)
      
      // Play sound for preview (bypass cooldown)
      playNotificationSound(effectiveSettings)
    } catch (err) {
      console.error('[Notifier] Preview error:', err)
    }
    return true
  })
}
