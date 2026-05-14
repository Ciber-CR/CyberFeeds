import React, { useEffect, useReducer, useRef, useState, useCallback } from 'react'
import { X, ExternalLink, ChevronDown } from 'lucide-react'
import type { NotificationHistoryItem, NotificationSettings } from '@shared/types'

interface State {
  stack: NotificationHistoryItem[]
  settings: NotificationSettings | null
}

type Action =
  | { type: 'SET_STACK'; stack: NotificationHistoryItem[]; settings: NotificationSettings }
  | { type: 'DISMISS'; id: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STACK': return { stack: action.stack, settings: action.settings }
    case 'DISMISS': return { ...state, stack: state.stack.filter(n => n.id !== action.id) }
    default: return state
  }
}

export default function NotifierApp(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, { stack: [], settings: null })
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolledToBottom, setScrolledToBottom] = useState(true)
  const hoverOffTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    const unsub = window.api.onNotifierStack((stack: any, settings: any) => {
      dispatch({ type: 'SET_STACK', stack: stack as NotificationHistoryItem[], settings: settings as NotificationSettings })
    })
    return unsub
  }, [])

  // Re-check scroll state whenever the stack changes
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10
    setScrolledToBottom(atBottom)
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

  const handleOpen = (item: NotificationHistoryItem): void => {
    if (state.settings?.openBehavior === 'browser') {
      if (item.link) window.api.openExternal(item.link)
    } else {
      if (item.feedId) {
        window.api.openInApp(item.feedId, item.articleId || '')
        handleDismiss(item.id)
      }
    }
  }

  if (state.stack.length === 0) return <div />

  const maxStack = state.settings?.maxStack || 5
  const overflowCount = Math.max(0, state.stack.length - maxStack)
  const showMoreIndicator = overflowCount > 0 && !scrolledToBottom

  return (
    <div
      className="notifier-root"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.01)' }}
    >
      {/* Clear All — fixed at top, always accessible */}
      {state.stack.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 4px 4px', flexShrink: 0 }}>
          <button
            className="clear-all-btn"
            onClick={(e) => { e.stopPropagation(); window.api.clearAllNotifications() }}
            title="Dismiss all notifications"
          >
            ✕ Clear All
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
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.15) transparent'
        }}
      >
        {state.stack.map(item => (
          <div key={item.id} className="notif-card" onClick={() => handleOpen(item)}>
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
              <span className="notif-feed">{item.feedName}</span>
              <button
                className="notif-close"
                onClick={e => { e.stopPropagation(); handleDismiss(item.id) }}
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
            <div className="notif-title">{item.title}</div>
            {item.body && <div className="notif-body" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.body}</div>}
            <div className="notif-actions" onClick={e => e.stopPropagation()}>
              <button className="notif-btn" onClick={() => handleDismiss(item.id)}>Dismiss</button>
              <button className="notif-btn" onClick={() => { window.api.markNotificationRead(item.articleId || ''); handleDismiss(item.id) }}>Mark Read</button>
              <button className="notif-btn" onClick={() => { window.api.snoozeNotifications(15) }} title="Snooze 15m">Snooze 15m</button>
              {item.link && (
                <button className="notif-btn" onClick={() => handleOpen(item)} title="Open in browser">
                  <ExternalLink size={10} style={{ display: 'inline', marginRight: 2 }} />
                  Open
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* "More" floating indicator */}
      {showMoreIndicator && (
        <div
          onClick={scrollToBottom}
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
          {overflowCount} more
        </div>
      )}
    </div>
  )
}
