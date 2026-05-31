import { useEffect, useState } from 'react'
import { X, Inbox } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import type { Article } from '../types'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function InboxPanel(): JSX.Element {
  const { closePanel, selectArticle } = useUIStore()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.getTodayArticles().then((data: Article[]) => {
      setArticles(data)
      setLoading(false)
    })
  }, [])

  // Group by feed
  const grouped = articles.reduce((acc, a) => {
    const key = a.feedTitle || a.feedId
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {} as Record<string, Article[]>)

  return (
    <div className="panel">
      <div className="panel-header">
        <Inbox size={16} style={{ color: 'var(--accent)' }} />
        <h2>Inbox Today</h2>
        <span className="text-muted text-sm">{articles.length} articles</span>
        <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={15} /></button>
      </div>
      <div className="panel-body">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No articles today</div>
        ) : (
          Object.entries(grouped).map(([feedName, items]) => (
            <div key={feedName} className="panel-section">
              <h3>{feedName}</h3>
              {items.map(a => (
                <div
                  key={a.id}
                  style={{ padding: '6px 0', borderBottom: '1px solid var(--border-muted)', cursor: 'pointer' }}
                  onClick={() => { selectArticle(a.id); closePanel() }}
                >
                  <div style={{ fontSize: 15, fontWeight: a.read ? 400 : 500, color: a.read ? 'var(--text-secondary)' : 'var(--text-primary)', marginBottom: 2, lineHeight: 1.4 }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatTime(a.pubDate)}</div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
