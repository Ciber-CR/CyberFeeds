import { useEffect, useState } from 'react'
import { X, Bell, Trash2 } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useSettingsStore } from '../store/settings.store'
import type { NotificationHistoryItem } from '../types'

function timeAgo(ts: number): string {
  const d = (Date.now() - ts) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.round(d / 60)}m ago`
  if (d < 86400) return `${Math.round(d / 3600)}h ago`
  return `${Math.round(d / 86400)}d ago`
}

export default function NotificationHistoryPanel(): JSX.Element {
  const { closePanel, selectArticle, selectFeed } = useUIStore()
  const { settings } = useSettingsStore()
  const [history, setHistory] = useState<NotificationHistoryItem[]>([])

  useEffect(() => {
    window.api.getNotificationHistory().then(setHistory)
  }, [])

  const handleClear = async (): Promise<void> => {
    await window.api.clearNotificationHistory()
    setHistory([])
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <Bell size={16} style={{ color: 'var(--accent)' }} />
        <h2>Notification History</h2>
        <button className="btn btn-ghost btn-icon" onClick={handleClear} title="Clear all"><Trash2 size={14} /></button>
        <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={15} /></button>
      </div>
      <div className="panel-body">
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No notifications</div>
        ) : (
          history.map(item => (
            <div
              key={item.id}
              style={{ padding: '8px 0', borderBottom: '1px solid var(--border-muted)', cursor: 'pointer' }}
              onClick={() => {
                if (settings.notifications.openBehavior === 'browser') {
                  if (item.link) window.api.openExternal(item.link)
                } else {
                  if (item.feedId) selectFeed(item.feedId)
                  if (item.articleId) selectArticle(item.articleId)
                  closePanel()
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{item.feedName}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(item.createdAt)}</span>
              </div>
              <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.4 }}>{item.title}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
