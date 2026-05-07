import React, { memo, useState, useEffect, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { ExternalLink, RefreshCw, Star, BookOpen, FileText, Rss } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useArticlesStore } from '../store/articles.store'
import { useSettingsStore } from '../store/settings.store'
import { FeedFavicon } from './ArticleList'
import type { Article } from '../types'

function formatFullDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function makeSummary(title: string, content: string): string {
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = title.toLowerCase().split(/\W+/).filter(w => w.length > 4)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30)
  const scored = sentences.map(s => {
    const sl = s.toLowerCase()
    const score = words.filter(w => sl.includes(w)).length
    return { s, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 3).map(x => x.s.trim()).join('. ') + '.'
}

const ArticleViewer = memo(function ArticleViewer(): JSX.Element {
  const { selectedArticleId } = useUIStore()
  const { articles, starArticle } = useArticlesStore()
  const { settings, update } = useSettingsStore()
  const [article, setArticle] = useState<Article | null>(null)
  const [fullHtml, setFullHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState('')
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)

  // Load article when selection changes
  useEffect(() => {
    if (!selectedArticleId) { setArticle(null); return }
    const found = articles.find(a => a.id === selectedArticleId)
    if (found) {
      setArticle(found)
      setFullHtml(null)
      setShowSummary(false)
      setSummary('')
    } else {
      window.api.getArticleById(selectedArticleId).then(a => {
        if (a) setArticle(a)
      })
    }
  }, [selectedArticleId])

  // Sync specific properties (like starred) if they change in the global store
  useEffect(() => {
    if (!article) return
    const found = articles.find(a => a.id === article.id)
    if (found && found.starred !== article.starred) {
      setArticle(prev => prev ? { ...prev, starred: found.starred } : found)
    }
  }, [articles])

  const fetchFullContent = useCallback(async () => {
    if (!article) return
    setLoading(true)
    const result = await window.api.fetchArticleContent(article.id)
    setLoading(false)
    if (result?.html) setFullHtml(result.html)
  }, [article])

  const handleSummary = useCallback(() => {
    if (!article) return
    const content = fullHtml || article.content || article.snippet
    setSummary(makeSummary(article.title, content))
    setShowSummary(true)
  }, [article, fullHtml])

  if (!article) {
    return (
      <div className="article-viewer">
        <div className="reader-empty">
          <Rss size={48} />
          <p>Select an article to read</p>
        </div>
      </div>
    )
  }

  const rawHtml = fullHtml || article.content || `<p>${article.snippet}</p>`
  const safeHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p','h1','h2','h3','h4','h5','h6','a','strong','em','ul','ol','li','blockquote','pre','code','img','figure','figcaption','video','source','picture','br','hr','table','thead','tbody','tr','th','td','span','div','section','article'],
    ALLOWED_ATTR: ['href','src','srcset','alt','title','class','id','width','height','controls','type','media'],
    FORCE_BODY: true
  })

  const needsFullFetch = !fullHtml && (article.content?.length || 0) < 1500

  return (
    <div className="article-viewer">
      <div className="viewer-toolbar">
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => window.api.openExternal(article.link)} title="Open in Browser">
          <ExternalLink size={13} />
          Open in Browser
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => starArticle(article.id, !article.starred)}
          title={article.starred ? 'Unstar' : 'Star'}
        >
          <Star size={15} fill={article.starred ? 'var(--star)' : 'none'} color={article.starred ? 'var(--star)' : undefined} />
        </button>
        <div style={{ width: 1, height: 16, background: 'var(--border-muted)', margin: '0 4px' }} />
        <button 
          className="btn btn-ghost btn-icon" 
          onClick={() => update({ readingFontSize: Math.max(12, (settings.readingFontSize || 15) - 1) })}
          title="Decrease Font Size"
        >
          <span style={{ fontSize: 11, fontWeight: 700 }}>A-</span>
        </button>
        <button 
          className="btn btn-ghost btn-icon" 
          onClick={() => update({ readingFontSize: Math.min(24, (settings.readingFontSize || 15) + 1) })}
          title="Increase Font Size"
        >
          <span style={{ fontSize: 13, fontWeight: 700 }}>A+</span>
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={handleSummary} title="Quick Summary">
          <FileText size={13} />
          Summary
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12 }}
          onClick={fetchFullContent}
          disabled={loading}
          title="Load Full Article"
        >
          {loading ? <div className="spinner" style={{ width: 13, height: 13 }} /> : <BookOpen size={13} />}
          {fullHtml ? 'Reload' : 'Full Article'}
        </button>
        {needsFullFetch && !loading && (
          <button className="btn btn-ghost btn-icon" onClick={fetchFullContent} title="Auto-fetch full content">
            <RefreshCw size={13} />
          </button>
        )}
      </div>

      <div className="viewer-content">
        <div className="reader-wrap" style={{ maxWidth: settings.readingMaxWidth || 720 }}>
          <h1 className="reader-title">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); window.api.openExternal(article.link) }} 
              style={{ color: 'inherit', textDecoration: 'none' }}
              title="Open in default browser"
            >
              {article.title}
            </a>
          </h1>
          <div className="reader-meta">
            {(article.feedIcon || article.feedTitle) && (
              <FeedFavicon icon={article.feedIcon} title={article.feedTitle} size={15} />
            )}
            {article.feedTitle && <span style={{ fontWeight: 500 }}>{article.feedTitle}</span>}
            {article.author && <><span>·</span><span>{article.author}</span></>}
            <span>·</span>
            <span>{formatFullDate(article.pubDate)}</span>
          </div>

          {showSummary && summary && (
            <div style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: 6, fontSize: 12 }}>Quick Summary</strong>
              {summary}
              <button
                onClick={() => setShowSummary(false)}
                style={{ display: 'block', marginTop: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}
              >
                Dismiss
              </button>
            </div>
          )}

          <div
            className="reader-body"
            style={{ fontSize: settings.readingFontSize || 15, userSelect: 'text', cursor: 'text' }}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
            onClick={(e) => {
              const target = e.target as HTMLElement
              const a = target.closest('a')
              if (a && a.href) {
                e.preventDefault()
                window.api.openExternal(a.href)
              }
            }}
            onMouseOver={(e) => {
              const target = e.target as HTMLElement
              const a = target.closest('a')
              if (a && a.href) {
                setHoveredLink(a.href)
              } else {
                setHoveredLink(null)
              }
            }}
            onMouseLeave={() => setHoveredLink(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              window.api.showReadOnlyContextMenu()
            }}
          />
        </div>
      </div>
      
      {hoveredLink && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          background: '#333333',
          color: '#eeeeee',
          borderTopRightRadius: '4px',
          borderTop: '1px solid #444444',
          borderRight: '1px solid #444444',
          padding: '3px 10px',
          fontSize: '12px',
          zIndex: 9999,
          maxWidth: '80%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
          boxShadow: '0 -1px 3px rgba(0,0,0,0.3)'
        }}>
          {hoveredLink}
        </div>
      )}
    </div>
  )
})

export default ArticleViewer
