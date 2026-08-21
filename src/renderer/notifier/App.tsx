import { useEffect, useReducer, useRef, useState, useCallback } from 'react'
import { X, ExternalLink, ChevronDown, Bell, BellOff, Clock, Check, Eye } from 'lucide-react'
import type { NotificationHistoryItem, NotificationSettings } from '@shared/types'
import { translations } from '@shared/translations'
import Tooltip from '../src/components/Tooltip'

const SNOOZE_LABELS: Record<number, string> = {
  15: '15m',
  30: '30m',
  60: '1h',
  120: '2h',
  240: '4h',
  480: '8h',
  1440: '24h'
}
const AUTO_HIDE_BUFFER_MS = 500

function formatSnoozeLabel(minutes: number): string {
  return SNOOZE_LABELS[minutes] ?? `${minutes}m`
}

/** Relative reception time — same rules as the main article list. */
function formatReceivedAt(ts: number, t: typeof translations.en): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / 3600000
  const formatTimeAgo = (val: number, str: string): string =>
    str.includes('{num}') ? str.replace('{num}', String(val)) : `${val}${str}`

  if (diffH < 1)
    return formatTimeAgo(Math.max(1, Math.round(diffMs / 60000)), t.articleList.timeAgo.mAgo)
  if (diffH < 24) return formatTimeAgo(Math.round(diffH), t.articleList.timeAgo.hAgo)
  if (diffH < 48) return t.articleList.yesterday
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatAbsoluteTime(ts: number, locale: string): string {
  return new Date(ts).toLocaleString(locale === 'es' ? 'es' : undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

interface State {
  stack: NotificationHistoryItem[]
  settings: NotificationSettings | null
  unseenCount: number
}

type Action =
  | {
      type: 'SET_STACK'
      stack: NotificationHistoryItem[]
      settings: NotificationSettings
      unseenCount: number
    }
  | { type: 'DISMISS'; id: string }
  | { type: 'CLEAR' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STACK':
      return { stack: action.stack, settings: action.settings, unseenCount: action.unseenCount }
    case 'DISMISS':
      return { ...state, stack: state.stack.filter((n) => n.id !== action.id) }
    case 'CLEAR':
      return { ...state, stack: [] }
    default:
      return state
  }
}

export default function NotifierApp(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, { stack: [], settings: null, unseenCount: 0 })
  const [lang, setLang] = useState<'en' | 'es'>('en')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollbarW, setScrollbarW] = useState(0)
  const hoverOffTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHovering = useRef(false)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownEnd = useRef<number | null>(null)
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [historyHovered, setHistoryHovered] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const t = translations[lang] || translations.en

  const stopCountdown = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current)
      countdownTimer.current = null
    }
    countdownEnd.current = null
  }, [])

  const startCountdown = useCallback((durationMs: number) => {
    stopCountdown()
    const end = Date.now() + Math.max(0, durationMs)
    countdownEnd.current = end

    const tick = (): void => {
      const remaining = Math.max(0, end - Date.now())
      setCountdownSeconds(Math.ceil(remaining / 1000))
      if (remaining <= 0) stopCountdown()
    }

    tick()
    countdownTimer.current = setInterval(tick, 250)
  }, [stopCountdown])

  const pauseCountdown = useCallback(() => {
    if (countdownEnd.current) {
      setCountdownSeconds(Math.max(0, Math.ceil((countdownEnd.current - Date.now()) / 1000)))
    }
    stopCountdown()
  }, [stopCountdown])

  // Debounced hover handlers — prevents flicker from transparent gaps between cards
  const handleMouseEnter = useCallback(() => {
    if (hoverOffTimer.current) {
      clearTimeout(hoverOffTimer.current)
      hoverOffTimer.current = null
    }
    isHovering.current = true
    setIsHovered(true)
    pauseCountdown()
    window.api.setHover(true)
  }, [pauseCountdown])

  const handleMouseLeave = useCallback(() => {
    if (hoverOffTimer.current) clearTimeout(hoverOffTimer.current)
    hoverOffTimer.current = setTimeout(() => {
      isHovering.current = false
      setIsHovered(false)
      window.api.setHover(false)
      const duration = state.settings?.duration ?? 6000
      startCountdown(duration + AUTO_HIDE_BUFFER_MS)
      hoverOffTimer.current = null
    }, 200)
  }, [startCountdown, state.settings?.duration])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (hoverOffTimer.current) clearTimeout(hoverOffTimer.current)
      stopCountdown()
    }
  }, [stopCountdown])

  useEffect(() => {
    const unsub = window.api.onNotifierStack(
      (stack: object[], settingsPayload: object, language?: string, unseenCount?: number) => {
        dispatch({
          type: 'SET_STACK',
          stack: stack as NotificationHistoryItem[],
          settings: settingsPayload as NotificationSettings,
          unseenCount: Number(unseenCount) || 0
        })
        if (!isHovering.current) {
          const duration = Number((settingsPayload as NotificationSettings)?.duration) || 6000
          startCountdown(duration + AUTO_HIDE_BUFFER_MS)
        }
        if (language === 'en' || language === 'es') setLang(language)
      }
    )
    return unsub
  }, [startCountdown])

  // When the popup window is hidden (auto-hide, dismiss-all, snooze, open-in-app,
  // open-history, ...) the main process clears its displayStack but never sends
  // an empty stack here (pushToWindow() early-returns on empty). The renderer
  // would otherwise keep the previous batch painted and briefly flash it again
  // the next time the window is shown, before the new stack arrives. Reset our
  // local stack as soon as the window becomes hidden so the next showing always
  // starts from a clean (transparent) state.
  useEffect(() => {
    const handleVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        dispatch({ type: 'CLEAR' })
        stopCountdown()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [stopCountdown])

  // Keep the top bar gutter aligned with the cards' right edge.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setScrollbarW(el.offsetWidth - el.clientWidth)
  }, [state.stack.length])

  const [dismissingIds, setDismissingIds] = useState<Set<string>>(() => new Set())

  const handleDismiss = useCallback((id: string, onAfterDismiss?: () => void): void => {
    setDismissingIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })

    setTimeout(() => {
      dispatch({ type: 'DISMISS', id })
      setDismissingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      if (state.stack.length <= 1) {
        isHovering.current = false
        setIsHovered(false)
        stopCountdown()
        window.api.setHover(false)
      }
      window.api.dismissNotification(id)
      onAfterDismiss?.()
    }, 200)
  }, [state.stack.length, stopCountdown])

  const handleViewInApp = (item: NotificationHistoryItem): void => {
    if (item.feedId) {
      window.api.openInApp(item.feedId, item.articleId || '')
    }
    handleDismiss(item.id)
  }

  const handleOpenInBrowser = (item: NotificationHistoryItem): void => {
    if (item.link) {
      window.api.openExternal(item.link)
    }
    handleDismiss(item.id)
  }

  const handleOpen = (item: NotificationHistoryItem): void => {
    if (state.settings?.openBehavior === 'browser') {
      handleOpenInBrowser(item)
    } else {
      handleViewInApp(item)
    }
  }

  if (state.stack.length === 0) return <div />

  const maxStack = Math.max(1, Number(state.settings?.maxStack) || 2)
  const visibleStack = state.stack.slice(0, maxStack)
  const overflowCount = Math.max(0, state.stack.length - maxStack)
  const showMoreIndicator = overflowCount > 0
  const snoozeMinutes = state.settings?.snoozeMinutes ?? 30
  const snoozeLabel = formatSnoozeLabel(snoozeMinutes)
  const snoozeText = t.notifier.snooze.replace('{time}', snoozeLabel)
  const snoozeTooltip = t.notifier.snoozeTooltip.replace('{time}', snoozeLabel)
  const cardOpenTooltip =
    state.settings?.openBehavior === 'browser' ? t.notifier.openTooltip : t.notifier.viewTooltip

  const rootRef = useRef<HTMLDivElement>(null)

  // Report measured content height to main process so the window wraps tightly
  useEffect(() => {
    if (state.stack.length === 0) return
    const el = rootRef.current
    if (!el) return
    const height = Math.ceil(el.scrollHeight)
    if (height > 40) {
      window.api.reportNotifierHeight(height)
    }
  }, [state.stack.length, state.settings, visibleStack.length, showMoreIndicator])

  return (
    <div
      ref={rootRef}
      className="notifier-root"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'auto',
        minHeight: 0,
        background: 'rgba(0,0,0,0.01)'
      }}
    >
      {/* Clear & See History — fixed at top, always accessible */}
      {state.stack.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingLeft: 4,
            paddingRight: Math.max(scrollbarW, 16) + 4,
            paddingBottom: 4,
            flexShrink: 0
          }}
        >
          <Tooltip label={t.notifier.historyTooltip} placement="bottom">
            <button
              className="clear-all-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: historyHovered ? 'var(--accent, #58a6ff)' : 'var(--bg-1, #161b22)',
                borderColor: historyHovered ? 'var(--accent, #58a6ff)' : 'var(--border, #30363d)',
                color: historyHovered ? '#0d1117' : 'var(--text-primary, #e6edf3)'
              }}
              onMouseEnter={() => setHistoryHovered(true)}
              onMouseLeave={() => setHistoryHovered(false)}
              onClick={(e) => {
                e.stopPropagation()
                window.api.openHistoryInApp()
              }}
            >
              <Bell size={12} style={{ flexShrink: 0 }} />
              {t.notifier.history}
              {state.unseenCount > 0 && (
                <span
                  style={{
                    fontWeight: 700,
                    color: historyHovered ? '#0d1117' : 'var(--accent, #58a6ff)'
                  }}
                >
                  {state.unseenCount > 99 ? '99+' : state.unseenCount}
                </span>
              )}
            </button>
          </Tooltip>
          <Tooltip label={snoozeTooltip} placement="bottom">
            <button
              className="clear-all-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
              onClick={(e) => {
                e.stopPropagation()
                window.api.snoozeNotifications(snoozeMinutes)
              }}
            >
              <Clock size={12} style={{ flexShrink: 0 }} />
              {snoozeText}
            </button>
          </Tooltip>
          <Tooltip
            label={state.stack.length > 1 ? t.notifier.closeAllTooltip : t.notifier.closeTooltip}
            placement="bottom"
          >
            <button
              className="clear-all-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
              onClick={(e) => {
                e.stopPropagation()
                isHovering.current = false
                setIsHovered(false)
                stopCountdown()
                window.api.setHover(false)
                window.api.clearAllNotifications()
              }}
            >
              <X size={12} style={{ flexShrink: 0 }} />
              <span
                className={`notif-countdown-num ${!isHovered && countdownSeconds > 0 ? 'breathing' : ''}`}
                style={{
                  minWidth: 12,
                  textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {countdownSeconds}
              </span>
            </button>
          </Tooltip>
        </div>
      )}

      {/* Scrollable notification list */}
      <div
        ref={scrollRef}
        style={{
          flexShrink: 0,
          overflowY: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          paddingTop: 4,
          // Keep card right edge aligned whether or not the scrollbar is visible
          paddingRight: 16,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.15) transparent'
        }}
      >
        {visibleStack.map((item) => (
          <div
            key={item.id}
            className={`notif-card ${dismissingIds.has(item.id) ? 'dismissing' : ''}`}
            onClick={() => handleOpen(item)}
          >
            {item.thumbnail && state.settings?.showThumbnails && (
              <div className="notif-thumbnail">
                <img
                  src={item.thumbnail}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).parentElement!.style.display = 'none'
                  }}
                />
              </div>
            )}
            <div className="notif-header">
              {item.icon ? (
                <img
                  src={item.icon}
                  alt=""
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 3,
                    objectFit: 'contain',
                    flexShrink: 0
                  }}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <span
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 3,
                    background: 'var(--accent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#0d1117',
                    flexShrink: 0
                  }}
                >
                  {(item.feedName || 'F').charAt(0).toUpperCase()}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0, display: 'inline-flex' }}>
                <Tooltip label={item.feedName} placement="top">
                  <span className="notif-feed" style={{ flex: '0 1 auto' }}>
                    {item.feedName}
                  </span>
                </Tooltip>
              </div>
              <Tooltip label={t.notifier.dismissTooltip} placement="bottom">
                <button
                  className="notif-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDismiss(item.id)
                  }}
                >
                  <X size={12} />
                </button>
              </Tooltip>
            </div>
            <Tooltip label={cardOpenTooltip} placement="bottom">
              <div className="notif-content-wrap">
                <div className="notif-title">{item.title}</div>
                {item.body && (
                  <div
                    className="notif-body"
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {item.body}
                  </div>
                )}
              </div>
            </Tooltip>
            <div className="notif-actions" onClick={(e) => e.stopPropagation()}>
              <Tooltip label={t.notifier.markReadTooltip} placement="bottom">
                <button
                  className="notif-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => {
                    window.api.markNotificationRead(item.articleId || '')
                    handleDismiss(item.id)
                  }}
                >
                  <Check size={11} />
                  {t.notifier.markRead}
                </button>
              </Tooltip>
              {item.feedId && (
                <Tooltip label={t.notifier.viewTooltip} placement="bottom">
                  <button
                    className="notif-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => handleViewInApp(item)}
                  >
                    <Eye size={11} />
                    {t.notifier.view}
                  </button>
                </Tooltip>
              )}
              {item.link && (
                <Tooltip label={t.notifier.openTooltip} placement="bottom">
                  <button
                    className="notif-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => handleOpenInBrowser(item)}
                  >
                    <ExternalLink size={11} />
                    {t.notifier.open}
                  </button>
                </Tooltip>
              )}
              {item.feedId && (
                <Tooltip label={t.notifier.muteTooltip} placement="bottom">
                  <button
                    className="notif-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => window.api.muteFeedNotifications(item.feedId!)}
                  >
                    <BellOff size={11} />
                    {t.notifier.mute}
                  </button>
                </Tooltip>
              )}
              <Tooltip
                label={t.notifier.receivedAt.replace(
                  '{time}',
                  formatAbsoluteTime(item.createdAt, lang)
                )}
                placement="bottom"
              >
                <span className="notif-time">{formatReceivedAt(item.createdAt, t)}</span>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
      {/* "More" floating indicator */}
      {showMoreIndicator && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 6,
            paddingBottom: 2,
            paddingRight: 16
          }}
        >
          <Tooltip label={t.notifier.moreTooltip} placement="top">
            <div
              style={{
                background: 'rgba(0, 170, 255, 0.65)',
                border: '1px solid rgba(0, 170, 255, 0.5)',
                borderRadius: 12,
                padding: '3px 12px',
                fontSize: 10,
                color: '#ffffff',
                cursor: 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
              }}
            >
              <ChevronDown size={10} />
              {overflowCount} {t.notifier.more}
            </div>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
