import { useEffect, useState } from 'react'
import { X, Bell, Trash2 } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useSettingsStore } from '../store/settings.store'
import type { NotificationHistoryItem } from '../types'
import { useTranslation } from '../hooks/useTranslation'
import Tooltip from './Tooltip'

function timeAgo(ts: number, t: any): string {
  const d = (Date.now() - ts) / 1000
  if (d < 60) return t.articleList.timeAgo.justNow
  if (d < 3600) return `${Math.round(d / 60)}${t.articleList.timeAgo.mAgo}`
  if (d < 86400) return `${Math.round(d / 3600)}${t.articleList.timeAgo.hAgo}`
  return `${Math.round(d / 86400)}${t.articleList.timeAgo.dAgo}`
}

let lastCheckedBackup: number | null = null

export default function NotificationHistoryPanel(): JSX.Element {
  const { closePanel, selectArticle, selectFeed } = useUIStore()
  const { settings } = useSettingsStore()
  const [history, setHistory] = useState<NotificationHistoryItem[]>([])
  const [lastCheckedTime, setLastCheckedTime] = useState(0)
  const { t } = useTranslation()

  useEffect(() => {
    window.api.getNotificationHistory().then(setHistory)
    
    const now = Date.now()
    const rawChecked = localStorage.getItem('lastCheckedNotificationsTime')
    const prevChecked = Number(rawChecked || 0)
    
    let referenceTime = prevChecked
    if (rawChecked && (now - prevChecked < 5000) && lastCheckedBackup !== null) {
      referenceTime = lastCheckedBackup
    } else {
      lastCheckedBackup = prevChecked
    }

    setLastCheckedTime(referenceTime)

    // Mark as checked now
    localStorage.setItem('lastCheckedNotificationsTime', String(now))
    window.api.markNotificationsChecked(now)
    useUIStore.setState({ unseenNotificationsCount: 0 })
  }, [])

  const handleClear = async (): Promise<void> => {
    await window.api.clearNotificationHistory()
    setHistory([])
  }

  // Partition into new and seen notifications
  const newNotifications = history.filter(item => item.createdAt > lastCheckedTime)
  const seenNotifications = history.filter(item => item.createdAt <= lastCheckedTime)

  const renderItem = (item: NotificationHistoryItem, isNew: boolean): JSX.Element => (
    <div
      key={item.id}
      style={{
        padding: '10px 0',
        borderBottom: '1px solid var(--border-muted)',
        cursor: 'pointer',
        opacity: isNew ? 1 : 0.65,
        transition: 'opacity 0.2s'
      }}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        {item.icon ? (
          <img
            src={item.icon}
            alt=""
            style={{ width: 14, height: 14, borderRadius: 3, objectFit: 'contain', flexShrink: 0 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span style={{
            width: 14, height: 14, borderRadius: 3, background: 'var(--accent)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, color: '#0d1117', flexShrink: 0
          }}>
            {(item.feedName || 'F').charAt(0).toUpperCase()}
          </span>
        )}
        <span style={{
          fontSize: 12,
          fontWeight: isNew ? 600 : 500,
          color: isNew ? 'var(--accent)' : 'var(--text-secondary)'
        }}>
          {item.feedName}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {timeAgo(item.createdAt, t)}
        </span>
      </div>
      <div style={{
        fontSize: 15,
        color: isNew ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: isNew ? 600 : 400,
        lineHeight: 1.4
      }}>
        {item.title}
      </div>
    </div>
  )

  return (
    <div className="panel">
      <div className="panel-header">
        <Bell size={16} style={{ color: 'var(--accent)' }} />
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {t.topBar.notificationHistory}
          {newNotifications.length > 0 && (
            <span className="cyber-badge" style={{ fontSize: 10, padding: '2px 6px' }}>
              {newNotifications.length} {t.notificationHistory.newCount}
            </span>
          )}
        </h2>
        <Tooltip label={t.notificationHistory.clearAll} placement="bottom">
          <button className="btn btn-ghost btn-icon" onClick={handleClear}><Trash2 size={14} /></button>
        </Tooltip>
        <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={15} /></button>
      </div>
      <div className="panel-body">
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
            {t.notificationHistory.empty}
          </div>
        ) : (
          <>
            {newNotifications.map(item => renderItem(item, true))}
            {newNotifications.length > 0 && seenNotifications.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '16px 0 12px',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.05em'
              }}>
                <div style={{ height: 1, flex: 1, background: 'var(--border-muted)' }} />
                {t.notificationHistory.alreadySeen}
                <div style={{ height: 1, flex: 1, background: 'var(--border-muted)' }} />
              </div>
            )}
            {seenNotifications.map(item => renderItem(item, false))}
          </>
        )}
      </div>
    </div>
  )
}
