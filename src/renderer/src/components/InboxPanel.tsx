import { useEffect, useState } from 'react'
import { X, Inbox, Star, Check } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useArticlesStore } from '../store/articles.store'
import type { Article } from '../types'
import { useTranslation } from '../hooks/useTranslation'
import Tooltip from './Tooltip'
import { FeedFavicon } from './ArticleList'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function InboxPanel(): JSX.Element {
  const { closePanel, selectArticle } = useUIStore()
  const { markRead, starArticle } = useArticlesStore()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    window.api.getTodayArticles().then((data: Article[]) => {
      setArticles(data)
      setLoading(false)
    })
  }, [])

  const handleStar = async (id: string, starred: boolean): Promise<void> => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, starred: starred ? 1 : 0 } : a)))
    await starArticle(id, starred)
  }

  const handleMarkRead = async (id: string, read: boolean): Promise<void> => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, read: read ? 1 : 0 } : a)))
    await markRead(id, read)
  }

  // Group by feed
  const grouped = articles.reduce(
    (acc, a) => {
      const key = a.feedTitle || a.feedId
      if (!acc[key]) acc[key] = []
      acc[key].push(a)
      return acc
    },
    {} as Record<string, Article[]>
  )

  return (
    <div className="panel">
      <div className="panel-header">
        <Inbox size={16} style={{ color: 'var(--accent)' }} />
        <h2>{t.inbox.title}</h2>
        <span className="text-muted text-sm">
          {articles.length} {t.inbox.articlesSuffix}
        </span>
        <button className="btn btn-ghost btn-icon" onClick={closePanel}>
          <X size={15} />
        </button>
      </div>
      <div className="panel-body">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="spinner" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
            {t.inbox.empty}
          </div>
        ) : (
          Object.entries(grouped).map(([feedName, items]) => {
            const feedIcon = items[0]?.feedIcon
            return (
              <div key={feedName} className="digest-card">
                <div className="digest-card-header">
                  <FeedFavicon icon={feedIcon} title={feedName} size={14} />
                  <span className="digest-card-title">{feedName}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {items.map((a) => {
                    const isNew = !a.read
                    const formattedTime = formatTime(a.pubDate)
                    return (
                      <div
                        key={a.id}
                        className="digest-item"
                        onClick={() => {
                          selectArticle(a.id)
                          closePanel()
                        }}
                      >
                        {/* Unread indicator dot */}
                        {isNew ? (
                          <Tooltip label={t.articleList.unread} placement="bottom">
                            <div className="unread-dot" style={{ marginTop: 6, flexShrink: 0 }} />
                          </Tooltip>
                        ) : (
                          <div style={{ width: 6, height: 6, marginTop: 6, flexShrink: 0 }} />
                        )}

                        <div className="digest-item-content">
                          <div
                            className="digest-item-title"
                            style={{
                              fontWeight: isNew ? 600 : 400,
                              color: isNew ? 'var(--text-primary)' : 'var(--text-secondary)'
                            }}
                          >
                            {a.title}
                          </div>

                          <div className="digest-item-meta">
                            <span>{formattedTime}</span>
                            {a.author && (
                              <>
                                <span>·</span>
                                <span
                                  style={{
                                    maxWidth: 100,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {a.author}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Hover actions */}
                        <div className="digest-item-actions" onClick={(e) => e.stopPropagation()}>
                          <Tooltip
                            label={a.starred ? t.articleViewer.unstar : t.articleViewer.star}
                            placement="bottom"
                          >
                            <button
                              className={`digest-action-btn ${a.starred ? 'active' : ''}`}
                              onClick={() => handleStar(a.id, !a.starred)}
                            >
                              <Star
                                size={12}
                                fill={a.starred ? 'var(--star)' : 'none'}
                                color={a.starred ? 'var(--star)' : 'var(--text-muted)'}
                              />
                            </button>
                          </Tooltip>

                          {isNew && (
                            <Tooltip label={t.notifier.markReadTooltip} placement="bottom">
                              <button
                                className="digest-action-btn"
                                onClick={() => handleMarkRead(a.id, true)}
                              >
                                <Check size={12} />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
