import { useEffect, useReducer, useRef, useState, useCallback } from 'react'
import { X, ExternalLink, ChevronDown, Bell } from 'lucide-react'
import type { NotificationHistoryItem, NotificationSettings } from '@shared/types'
import { translations } from '@shared/translations'

const SNOOZE_LABELS: Record<number, string> = {
  15: '15m',
  30: '30m',
  60: '1h',
  120: '2h',
  240: '4h',
  480: '8h',
  1440: '24h'
}

function formatSnoozeLabel(minutes: number): string {
  return SNOOZE_LABELS[minutes] ?? `${minutes}m`
}

/** Relative reception time — same rules as the main article list. */
function formatReceivedAt(ts: number, t: typeof translations.en): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / 3600000
  if (diffH < 1) return `${Math.max(1, Math.round(diffMs / 60000))}${t.articleList.timeAgo.mAgo}`
  if (diffH < 24) return `${Math.round(diffH)}${t.articleList.timeAgo.hAgo}`
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
  | { type: 'SET_STACK'; stack: NotificationHistoryItem[]; settings: NotificationSettings; unseenCount: number }
  | { type: 'DISMISS'; id: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STACK': return { stack: action.stack, settings: action.settings, unseenCount: action.unseenCount }
    case 'DISMISS': return { ...state, stack: state.stack.filter(n => n.id !== action.id) }
    default: return state
  }
}

export default function NotifierApp(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, { stack: [], settings: null, unseenCount: 0 })
  const [lang, setLang] = useState<'en' | 'es'>('en')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolledToBottom, setScrolledToBottom] = useState(true)
  const [scrollbarW, setScrollbarW] = useState(0)
  const hoverOffTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [historyHovered, setHistoryHovered] = useState(false)

  const t = translations[lang] || translations.en

  // Debounced hover handlers — prevents flicker from transparent gaps between cards
  const handleMouseEnter = useCallback(() => {
    if (hoverOffTimer.current) {
      clearTimeout(hoverOffTimer.current)
      hoverOffTimer.current = null
    }
    window.api.setHover(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverOffTimer.current) clearTimeout(hoverOffTimer.current)
    hoverOffTimer.current = setTimeout(() => {
      window.api.setHover(false)
      hoverOffTimer.current = null
    }, 200)
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (hoverOffTimer.current) clearTimeout(hoverOffTimer.current)
    }
  }, [])

  useEffect(() => {
    const unsub = window.api.onNotifierStack((stack: any, settings: any, language: any, unseenCount: any) => {
      dispatch({ type: 'SET_STACK', stack: stack as NotificationHistoryItem[], settings: settings as NotificationSettings, unseenCount: Number(unseenCount) || 0 })
      if (language) setLang(language)
    })
    return unsub
  }, [])

  // Re-check scroll state whenever the stack changes
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10
    setScrolledToBottom(atBottom)
    // Measure the actual scrollbar width so the top bar can mirror it (keeps
    // "Clear All" aligned with the cards' right edge, not the scrollbar).
    setScrollbarW(el.offsetWidth - el.clientWidth)
  }, [state.stack.length])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10
    setScrolledToBottom(atBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [])

  const handleDismiss = (id: string): void => {
    dispatch({ type: 'DISMISS', id })
    window.api.dismissNotification(id)
  }

  const handleViewInApp = (item: NotificationHistoryItem): void => {
    if (item.feedId) {
      window.api.openInApp(item.feedId, item.articleId || '')
      handleDismiss(item.id)
    }
  }

  const handleOpenInBrowser = (item: NotificationHistoryItem): void => {
    if (item.link) {
      window.api.openExternal(item.link)
    }
  }

  const handleOpen = (item: NotificationHistoryItem): void => {
    if (state.settings?.openBehavior === 'browser') {
      handleOpenInBrowser(item)
    } else {
      handleViewInApp(item)
    }
  }

  if (state.stack.length === 0) return <div />

  const maxStack = state.settings?.maxStack || 5
  const overflowCount = Math.max(0, state.stack.length - maxStack)
  const showMoreIndicator = overflowCount > 0 && !scrolledToBottom
  const snoozeMinutes = state.settings?.snoozeMinutes ?? 30
  const snoozeLabel = formatSnoozeLabel(snoozeMinutes)
  const snoozeText = t.notifier.snooze.replace('{time}', snoozeLabel)
  const snoozeTooltip = t.notifier.snoozeTooltip.replace('{time}', snoozeLabel)
  const cardOpenTooltip = state.settings?.openBehavior === 'browser'
    ? t.notifier.openTooltip
    : t.notifier.viewTooltip

  return (
    <div
      className="notifier-root"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.01)' }}
    >
      {/* Clear & See History — fixed at top, always accessible */}
      {state.stack.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 4, paddingRight: Math.max(scrollbarW, 16) + 4, paddingBottom: 4, flexShrink: 0 }}>
          <button
            className="clear-all-btn"
            style={{
              marginRight: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              backgroundColor: historyHovered ? 'var(--accent, #bd93f9)' : 'rgba(30,30,46,0.92)',
              borderColor: historyHovered ? 'var(--accent, #bd93f9)' : 'rgba(255,255,255,0.18)',
              color: historyHovered ? '#0d1117' : '#ccc'
            }}
            onMouseEnter={() => setHistoryHovered(true)}
            onMouseLeave={() => setHistoryHovered(false)}
            onClick={(e) => { e.stopPropagation(); window.api.openHistoryInApp() }}
            title={t.notifier.historyTooltip}
          >
            <Bell size={12} style={{ flexShrink: 0 }} />
            {t.notifier.history}
            {state.unseenCount > 0 && (
              <span style={{
                fontWeight: 700,
                color: historyHovered ? '#0d1117' : 'var(--accent, #bd93f9)'
              }}>
                {state.unseenCount > 99 ? '99+' : state.unseenCount}
              </span>
            )}
          </button>
          <button
            className="clear-all-btn"
            onClick={(e) => { e.stopPropagation(); window.api.clearAllNotifications() }}
            title={state.stack.length > 1 ? t.notifier.closeAllTooltip : t.notifier.closeTooltip}
          >
            ✕ {state.stack.length > 1 ? t.notifier.closeAll : t.notifier.close}
          </button>
        </div>
      )}

      {/* Scrollable notification list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: state.stack.length > maxStack ? 'auto' : 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          paddingTop: 4,
          // Keep card right edge aligned whether or not the scrollbar is visible
          paddingRight: state.stack.length > maxStack ? 0 : 16,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.15) transparent'
        }}
      >
        {state.stack.map(item => (
          <div key={item.id} className="notif-card" onClick={() => handleOpen(item)} title={cardOpenTooltip}>
            {item.thumbnail && state.settings?.showThumbnails && (
              <div className="notif-thumbnail">
                <img
                  src={item.thumbnail}
                  alt=""
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                />
              </div>
            )}
            <div className="notif-header">
              {item.icon ? (
                <img
                  src={item.icon}
                  alt=""
                  style={{ width: 15, height: 15, borderRadius: 3, objectFit: 'contain', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <span style={{
                  width: 15, height: 15, borderRadius: 3, background: 'var(--accent)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: '#0d1117', flexShrink: 0
                }}>
                  {(item.feedName || 'F').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="notif-feed" title={item.feedName}>{item.feedName}</span>
              <button
                className="notif-close"
                onClick={e => { e.stopPropagation(); handleDismiss(item.id) }}
                title={t.notifier.dismissTooltip}
              >
                <X size={12} />
              </button>
            </div>
            <div className="notif-title">{item.title}</div>
            {item.body && <div className="notif-body" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.body}</div>}
            <div className="notif-actions" onClick={e => e.stopPropagation()}>
              <button
                className="notif-btn"
                onClick={() => { window.api.markNotificationRead(item.articleId || ''); handleDismiss(item.id) }}
                title={t.notifier.markReadTooltip}
              >
                {t.notifier.markRead}
              </button>
              <button
                className="notif-btn"
                onClick={() => { window.api.snoozeNotifications(snoozeMinutes) }}
                title={snoozeTooltip}
              >
                {snoozeText}
              </button>
              {item.feedId && (
                <button className="notif-btn" onClick={() => handleViewInApp(item)} title={t.notifier.viewTooltip}>
                  {t.notifier.view}
                </button>
              )}
              {item.link && (
                <button className="notif-btn" onClick={() => handleOpenInBrowser(item)} title={t.notifier.openTooltip}>
                  <ExternalLink size={10} style={{ display: 'inline', marginRight: 2 }} />
                  {t.notifier.open}
                </button>
              )}
              <span
                className="notif-time"
                title={t.notifier.receivedAt.replace('{time}', formatAbsoluteTime(item.createdAt, lang))}
              >
                {formatReceivedAt(item.createdAt, t)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {/* "More" floating indicator */}
      {showMoreIndicator && (
        <div
          onClick={scrollToBottom}
          title={t.notifier.moreTooltip}
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 170, 255, 0.65)',
            border: '1px solid rgba(0, 170, 255, 0.5)',
            borderRadius: 12,
            padding: '3px 12px',
            fontSize: 10,
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            zIndex: 10,
            backdropFilter: 'blur(8px)',
            transition: 'opacity 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}
        >
          <ChevronDown size={10} />
          {overflowCount} {t.notifier.more}
        </div>
      )}
    </div>
  )
}
