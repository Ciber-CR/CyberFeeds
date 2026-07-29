import { memo, useState, useEffect, useCallback, useRef } from 'react'
import DOMPurify from 'dompurify'
import { ExternalLink, Star, FileText, Rss, Share2, Check, ArrowUp } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useArticlesStore } from '../store/articles.store'
import { useSettingsStore } from '../store/settings.store'
import { FeedFavicon } from './ArticleList'
import Tooltip from './Tooltip'
import type { Article } from '../types'
import { useTranslation } from '../hooks/useTranslation'

function formatFullDate(ts: number, lang: string): string {
  return new Date(ts).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function makeSummary(title: string, content: string): string {
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const words = title
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 30)
  const scored = sentences.map((s) => {
    const sl = s.toLowerCase()
    const score = words.filter((w) => sl.includes(w)).length
    return { s, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return (
    scored
      .slice(0, 3)
      .map((x) => x.s.trim())
      .join('. ') + '.'
  )
}

const ArticleViewer = memo(function ArticleViewer(): JSX.Element {
  const { selectedArticleId } = useUIStore()
  const { articles, starArticle } = useArticlesStore()
  const { settings, update } = useSettingsStore()
  const { t, language } = useTranslation()
  const [article, setArticle] = useState<Article | null>(null)
  const [fullHtml, setFullHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState('')
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollRaf = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current)
    }
  }, [])

  // Load article when selection changes
  useEffect(() => {
    if (!selectedArticleId) {
      setArticle(null)
      return
    }
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    setLinkCopied(false)
    setShowScrollTop(false)
    if (contentRef.current) contentRef.current.scrollTop = 0
    const found = articles.find((a) => a.id === selectedArticleId)
    if (found) {
      setArticle(found)
      setFullHtml(null)
      setShowSummary(false)
      setSummary('')
    } else {
      window.api.getArticleById(selectedArticleId).then((a) => {
        if (a) setArticle(a)
      })
    }
  }, [selectedArticleId])

  // Sync specific properties (like starred) if they change in the global store
  useEffect(() => {
    if (!article) return
    const found = articles.find((a) => a.id === article.id)
    if (found && found.starred !== article.starred) {
      setArticle((prev) => (prev ? { ...prev, starred: found.starred } : found))
    }
  }, [articles])

  // Automatically fetch full article content when article changes
  useEffect(() => {
    if (!article) {
      setFullHtml(null)
      return
    }
    let active = true
    setLoading(true)
    setFullHtml(null)

    window.api
      .fetchArticleContent(article.id)
      .then((result) => {
        if (!active) return
        setLoading(false)
        if (result?.html) {
          setFullHtml(result.html)
        }
      })
      .catch((err) => {
        if (!active) return
        setLoading(false)
        console.error('Failed to fetch full article content:', err)
      })

    return () => {
      active = false
    }
  }, [article?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentScroll = useCallback(() => {
    if (scrollRaf.current != null) return
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = undefined
      const el = contentRef.current
      if (!el) return
      setShowScrollTop(el.scrollTop > 400)
    })
  }, [])

  const scrollToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleSummary = useCallback(() => {
    if (!article) return
    const content = fullHtml || article.content || article.snippet
    setSummary(makeSummary(article.title, content))
    setShowSummary(true)
  }, [article, fullHtml])

  const handleShare = useCallback(async () => {
    if (!article?.link) return
    try {
      await navigator.clipboard.writeText(article.link)
      setLinkCopied(true)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setLinkCopied(false), 1800)
    } catch {
      /* ignore clipboard errors */
    }
  }, [article])

  if (!article) {
    return (
      <div className="article-viewer">
        <div className="reader-empty">
          <Rss size={48} />
          <p>{t.articleViewer.selectToRead}</p>
        </div>
      </div>
    )
  }

  const rawHtml = fullHtml || article.content || `<p>${article.snippet}</p>`
  const safeHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'a',
      'strong',
      'em',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'code',
      'img',
      'figure',
      'figcaption',
      'video',
      'source',
      'picture',
      'br',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'span',
      'div',
      'section',
      'article'
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'srcset',
      'alt',
      'title',
      'class',
      'id',
      'width',
      'height',
      'controls',
      'type',
      'media'
    ],
    FORCE_BODY: true
  })

  return (
    <div className="article-viewer">
      <div className="viewer-toolbar">
        <Tooltip label={t.articleViewer.quickSummary} placement="bottom">
          <button
            className="btn btn-ghost has-label"
            style={{ fontSize: 12 }}
            onClick={handleSummary}
          >
            <FileText size={13} />
            <span className="viewer-toolbar-label">{t.articleViewer.summary}</span>
          </button>
        </Tooltip>
        {loading && (
          <div
            className="viewer-toolbar-loading"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 8px',
              color: 'var(--text-muted)',
              fontSize: 11
            }}
          >
            <div className="spinner" style={{ width: 11, height: 11 }} />
            <span>{t.articleViewer.loadingFull}</span>
          </div>
        )}
        <Tooltip label={t.articleViewer.openInBrowserTooltip} placement="bottom">
          <button
            className="btn btn-ghost has-label"
            style={{ fontSize: 12 }}
            onClick={() => window.api.openExternal(article.link)}
          >
            <ExternalLink size={13} />
            <span className="viewer-toolbar-label">{t.articleViewer.openInBrowser}</span>
          </button>
        </Tooltip>
        <Tooltip
          label={linkCopied ? t.articleViewer.linkCopied : t.articleViewer.shareTooltip}
          placement="bottom"
        >
          <button
            className={`btn btn-ghost has-label${linkCopied ? ' is-copied' : ''}`}
            style={{ fontSize: 12 }}
            onClick={handleShare}
          >
            {linkCopied ? <Check size={13} /> : <Share2 size={13} />}
            <span className="viewer-toolbar-label">
              {linkCopied ? t.articleViewer.copied : t.articleViewer.share}
            </span>
          </button>
        </Tooltip>
        <div className="viewer-toolbar-sep" />
        <Tooltip label={t.articleViewer.decreaseFont} placement="bottom">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() =>
              update({ readingFontSize: Math.max(12, (settings.readingFontSize || 15) - 1) })
            }
          >
            <span style={{ fontSize: 11, fontWeight: 700 }}>A-</span>
          </button>
        </Tooltip>
        <Tooltip label={t.articleViewer.increaseFont} placement="bottom">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() =>
              update({ readingFontSize: Math.min(24, (settings.readingFontSize || 15) + 1) })
            }
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>A+</span>
          </button>
        </Tooltip>
        <div className="viewer-toolbar-sep" />
        <Tooltip
          label={article.starred ? t.articleViewer.unstar : t.articleViewer.star}
          placement="bottom"
        >
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => starArticle(article.id, !article.starred)}
          >
            <Star
              size={15}
              fill={article.starred ? 'var(--star)' : 'none'}
              color={article.starred ? 'var(--star)' : undefined}
            />
          </button>
        </Tooltip>
      </div>

      <div
        className="viewer-content"
        ref={contentRef}
        onScroll={handleContentScroll}
        onContextMenu={(e) => {
          e.preventDefault()
          window.dispatchEvent(
            new CustomEvent('cyberfeeds:close-context-menus', { detail: 'viewer' })
          )
          const target = e.target as HTMLElement
          const a = target.closest('a')
          let linkUrl = ''
          if (a) {
            if (a.closest('.reader-title')) {
              linkUrl = article.link
            } else if (a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
              linkUrl = a.href
            }
          }
          const hasSelection = !!window.getSelection()?.toString()
          window.api.showReadOnlyContextMenu(linkUrl, hasSelection)
        }}
      >
        <div className="reader-wrap" style={{ maxWidth: settings.readingMaxWidth || 720 }}>
          <h1 className="reader-title">
            <Tooltip label={t.articleViewer.openDefaultBrowser} placement="bottom">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  window.api.openExternal(article.link)
                }}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {article.title}
              </a>
            </Tooltip>
          </h1>
          <div className="reader-meta">
            {(article.feedIcon || article.feedTitle) && (
              <FeedFavicon icon={article.feedIcon} title={article.feedTitle} size={15} />
            )}
            {article.feedTitle && <span style={{ fontWeight: 500 }}>{article.feedTitle}</span>}
            {article.author && (
              <>
                <span>·</span>
                <span>{article.author}</span>
              </>
            )}
            <span>·</span>
            <span>{formatFullDate(article.pubDate, language)}</span>
          </div>

          {showSummary && summary && (
            <div
              style={{
                background: 'var(--accent-subtle)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius)',
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--text-primary)'
              }}
            >
              <strong
                style={{ color: 'var(--accent)', display: 'block', marginBottom: 6, fontSize: 12 }}
              >
                {t.articleViewer.quickSummary}
              </strong>
              {summary}
              <button
                onClick={() => setShowSummary(false)}
                style={{
                  display: 'block',
                  marginTop: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 11
                }}
              >
                {t.articleViewer.dismiss}
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
          />
        </div>
      </div>

      {showScrollTop && (
        <Tooltip label={t.articleViewer.backToTop} placement="bottom">
          <button
            type="button"
            className="scroll-top-fab"
            onClick={scrollToTop}
            aria-label={t.articleViewer.backToTop}
          >
            <ArrowUp size={16} />
          </button>
        </Tooltip>
      )}

      {hoveredLink && (
        <div
          style={{
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
          }}
        >
          {hoveredLink}
        </div>
      )}
    </div>
  )
})

export default ArticleViewer
