import React, { memo, useRef, useCallback, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Star,
  Search,
  Filter,
  ChevronDown,
  ArrowUp,
  Circle,
  CircleDot,
  Link2,
  Image,
  ExternalLink,
  Trash2,
  CheckCheck
} from 'lucide-react'
import { useArticlesStore } from '../store/articles.store'
import { useUIStore } from '../store/ui.store'
import { useFeedsStore } from '../store/feeds.store'
import { useSettingsStore } from '../store/settings.store'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from './ConfirmDialog'
import type { Article } from '../types'
import { useTranslation } from '../hooks/useTranslation'
import Tooltip from './Tooltip'

function formatDate(ts: number, t: any): string {
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

/** Feed favicon with graceful letter-avatar fallback */
const FeedFavicon = memo(function FeedFavicon({
  icon,
  title,
  size = 16
}: {
  icon?: string
  title?: string
  size?: number
}) {
  // Retry medicine: if the network is temporarily down, don't permanently fall back.
  const [, setAttempt] = React.useState(0)
  const [failed, setFailed] = React.useState(false)
  const [retryToken, setRetryToken] = React.useState(0)

  const retryTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const MAX_ATTEMPTS = 5
  const BACKOFF_MS = [10_000, 30_000, 90_000, 180_000, 300_000] // 10s/30s/1.5m/3m/5m

  React.useEffect(() => {
    // Reset when icon changes
    setAttempt(0)
    setFailed(false)
    setRetryToken(0)
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [icon])

  React.useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [])

  const letter = (title || '?').charAt(0).toUpperCase()
  const colors = [
    '#58a6ff',
    '#3fb950',
    '#d29922',
    '#f0883e',
    '#bc8cff',
    '#39d353',
    '#e3b341',
    '#ff7b72'
  ]
  const color = colors[letter.charCodeAt(0) % colors.length]

  const avatarStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 3,
    background: color,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.max(8, size * 0.6),
    fontWeight: 700,
    color: '#0d1117',
    flexShrink: 0,
    lineHeight: 1,
    userSelect: 'none'
  }

  const resolvedSrc = React.useMemo(() => {
    if (!icon) return undefined
    // Ensure retries don't get stuck on a cached failure: add a busting query using retryToken and timestamp.
    const sep = icon.includes('?') ? '&' : '?'
    const ts = Date.now()
    return `${icon}${sep}bb_retry=${retryToken}&t=${ts}`
  }, [icon, retryToken])

  const scheduleRetry = React.useCallback(
    (nextAttempt: number) => {
      if (!icon) return
      if (nextAttempt >= MAX_ATTEMPTS) return

      const delay =
        BACKOFF_MS[Math.min(nextAttempt - 1, BACKOFF_MS.length - 1)] ??
        BACKOFF_MS[BACKOFF_MS.length - 1]

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }

      retryTimeoutRef.current = setTimeout(() => {
        setFailed(false)
        setRetryToken((t) => t + 1)
      }, delay)
    },
    [icon]
  )

  if (!icon || failed) {
    // While retrying we show the letter avatar, but we will flip back to img on a successful later load.
    return <span style={avatarStyle}>{letter}</span>
  }

  return (
    <img
      src={resolvedSrc}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 3, objectFit: 'contain', flexShrink: 0, display: 'block' }}
      onError={() => {
        setAttempt((a) => {
          const next = a + 1
          setFailed(true)
          scheduleRetry(next)
          return next
        })
      }}
      onLoad={() => {
        // If it finally loads, stop falling back.
        setFailed(false)
        setAttempt(0)
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }
      }}
    />
  )
})

const ArticleList = memo(function ArticleList(): JSX.Element {
  const {
    articles,
    totalCount,
    loading,
    loadingMore,
    loadMore,
    deleteArticle,
    removeArticleFromList,
    markRead
  } = useArticlesStore()
  const {
    selectedArticleId,
    selectedFeedId,
    unreadOnly,
    search,
    selectArticle,
    setUnreadOnly,
    setSearch
  } = useUIStore()
  const [ctx, setCtx] = React.useState<{ x: number; y: number; id: string } | null>(null)
  const { feeds, unreadCounts } = useFeedsStore()
  const { settings, togglePolling } = useSettingsStore()
  const { t, language } = useTranslation()
  const parentRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const prevSelectedId = useRef<string | null>(null)
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm()

  // Auto-remove read articles from "Unread Only" view when moving to next
  useEffect(() => {
    if (unreadOnly && prevSelectedId.current && prevSelectedId.current !== selectedArticleId) {
      const prevId = prevSelectedId.current
      const art = articles.find((a) => a.id === prevId)
      if (art && art.read) {
        removeArticleFromList(prevId)
      }
    }
    prevSelectedId.current = selectedArticleId
  }, [selectedArticleId, unreadOnly, articles, removeArticleFromList])

  const selectedFeed = feeds.find((f) => f.id === selectedFeedId)
  const title =
    selectedFeedId === 'starred'
      ? t.articleList.favorites
      : selectedFeed?.title || t.articleList.allFeeds

  const unreadDisplayCount = React.useMemo(() => {
    if (selectedFeedId === 'starred') return totalCount
    if (selectedFeedId === null) return Object.values(unreadCounts).reduce((a, b) => a + b, 0)
    if (selectedFeedId.startsWith('folder:')) {
      const folderId = selectedFeedId.split(':')[1]
      const folderFeeds = feeds.filter((f) => f.folderId === folderId)
      return folderFeeds.reduce((sum, f) => sum + (unreadCounts[f.id] || 0), 0)
    }
    return unreadCounts[selectedFeedId || ''] || 0
  }, [selectedFeedId, unreadCounts, totalCount, feeds])

  const ITEM_H = 90
  const ITEM_H_WITH_THUMB = 140

  const rowVirtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const article = articles[index]
      if (article?.thumbnail && settings.showArticleThumbnails) return ITEM_H_WITH_THUMB
      return ITEM_H
    },
    overscan: 8
  })

  // Count of articles below the current viewport, and whether to offer "back to top".
  const [belowCount, setBelowCount] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const rafRef = useRef<number | undefined>(undefined)

  // NOTE: this must NOT run inside the getVirtualItems() effect — doing so creates
  // a render→measure→setState→render feedback loop that visibly jitters the list.
  // It is driven by real scroll events (rAF-throttled) and by data changes only.
  const computeScrollState = useCallback(() => {
    const el = parentRef.current
    if (!el) return
    const bottom = el.scrollTop + el.clientHeight
    let lastVisible = -1
    for (const it of rowVirtualizer.getVirtualItems()) {
      if (it.start < bottom) lastVisible = Math.max(lastVisible, it.index)
    }
    setBelowCount(lastVisible < 0 ? 0 : Math.max(0, totalCount - (lastVisible + 1)))
    setShowScrollTop(el.scrollTop > 400)
  }, [rowVirtualizer, totalCount])

  const handleListScroll = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = undefined
      computeScrollState()
    })
  }, [computeScrollState])

  const scrollToTop = useCallback(() => {
    parentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Recompute when the dataset changes (feed switch, load-more, filter) — not per render.
  useEffect(() => {
    computeScrollState()
  }, [totalCount, articles.length, loading, computeScrollState])
  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  useEffect(() => {
    const items = rowVirtualizer.getVirtualItems()
    if (items.length === 0) return
    const lastItem = items[items.length - 1]
    if (lastItem.index >= articles.length - 10 && !loadingMore) {
      loadMore()
    }
  }, [rowVirtualizer.getVirtualItems()])

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    clearTimeout(searchRef.current)
    const val = e.target.value
    searchRef.current = setTimeout(() => setSearch(val), 300)
  }, [])

  useEffect(() => {
    const handleUp = () => setCtx(null)
    const handleOtherMenu = (e: Event): void => {
      if ((e as CustomEvent<string>).detail !== 'articleList') setCtx(null)
    }
    window.addEventListener('click', handleUp)
    window.addEventListener('cyberfeeds:close-context-menus', handleOtherMenu)
    return () => {
      window.removeEventListener('click', handleUp)
      window.removeEventListener('cyberfeeds:close-context-menus', handleOtherMenu)
    }
  }, [])

  return (
    <div className="article-list-pane" onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <div className="article-list-header">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {selectedFeedId === 'starred' ? (
            <Star size={16} fill="var(--star)" color="var(--star)" style={{ marginRight: 4 }} />
          ) : (
            selectedFeed?.icon && (
              <FeedFavicon icon={selectedFeed.icon} title={selectedFeed.title} size={16} />
            )
          )}
          <h2
            style={{
              marginLeft: selectedFeedId === 'starred' || selectedFeed?.icon ? 4 : 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {title}
          </h2>
        </div>

        <Tooltip
          label={
            language === 'es'
              ? `Sondeo: ${settings.pollingEnabled ? 'ENCENDIDO' : 'APAGADO'} | Sin leer: ${unreadDisplayCount} | Total: ${totalCount} | Clic para alternar`
              : `Polling: ${settings.pollingEnabled ? 'ON' : 'OFF'} | Unread: ${unreadDisplayCount} | Total: ${totalCount} | Click to toggle`
          }
          placement="bottom"
        >
          <div
            className="cyber-badge no-brackets"
            onClick={() => togglePolling()}
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              margin: '0 10px',
              gap: 8,
              padding: '3px 10px'
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: settings.pollingEnabled ? 'var(--accent)' : 'var(--text-muted)',
                opacity: 0.8
              }}
            >
              {settings.pollingEnabled ? t.articleList.monitoring : t.articleList.paused}
            </span>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: settings.pollingEnabled ? 'var(--accent)' : '#444',
                boxShadow: settings.pollingEnabled ? '0 0 6px var(--accent)' : 'none',
                animation: settings.pollingEnabled ? 'pulse 2s infinite' : 'none'
              }}
            />
            <span style={{ opacity: 0.8, marginLeft: 4 }}>
              [{unreadOnly ? unreadDisplayCount : `${unreadDisplayCount} / ${totalCount}`}]
            </span>
          </div>
        </Tooltip>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Tooltip
            label={unreadOnly ? t.articleList.showAll : t.articleList.unreadOnly}
            placement="bottom"
          >
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setUnreadOnly(!unreadOnly)}
              style={unreadOnly ? { color: 'var(--accent)' } : undefined}
            >
              <Filter size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-muted)' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }}
          />
          <input
            className="search-input"
            style={{ paddingLeft: 28 }}
            placeholder={t.articleList.searchPlaceholder}
            defaultValue={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Virtual list */}
      <div className="article-list-scroll" ref={parentRef} onScroll={handleListScroll}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="spinner" />
          </div>
        ) : articles.length === 0 ? (
          <div
            style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}
          >
            {t.articleList.noArticles}
          </div>
        ) : (
          <div className="article-virtual-inner" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const article = articles[virtualRow.index]
              return (
                <ArticleItem
                  key={article.id}
                  article={article}
                  selected={selectedArticleId === article.id}
                  onSelect={selectArticle}
                  onContextMenu={(e, id) => {
                    e.preventDefault()
                    window.dispatchEvent(
                      new CustomEvent('cyberfeeds:close-context-menus', { detail: 'articleList' })
                    )
                    setCtx({ x: e.clientX, y: e.clientY, id })
                  }}
                  measureRef={rowVirtualizer.measureElement}
                  dataIndex={virtualRow.index}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                />
              )
            })}
          </div>
        )}
        {loadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
            <div className="spinner" />
          </div>
        )}
      </div>

      {/* Floating "more below" indicator — mirrors the notifier popup pill */}
      {!loading && belowCount > 0 && (
        <div className="list-more-pill">
          <ChevronDown size={10} />
          {belowCount} {t.articleList.moreBelow}
        </div>
      )}

      {/* Back-to-top button — appears once scrolled down */}
      {!loading && showScrollTop && (
        <Tooltip label={t.articleList.backToTop} placement="bottom">
          <button
            className="scroll-top-fab"
            onClick={scrollToTop}
            aria-label={t.articleList.backToTop}
          >
            <ArrowUp size={16} />
          </button>
        </Tooltip>
      )}

      {ctx &&
        (() => {
          const article = articles.find((a) => a.id === ctx.id)
          return (
            <div
              className="ctx-menu"
              style={{ left: ctx.x, top: Math.min(ctx.y, window.innerHeight - 220) }}
              onClick={(e) => e.stopPropagation()}
            >
              {article && (
                <>
                  <div
                    className="ctx-item"
                    onClick={() => {
                      markRead(article.id, !article.read)
                      setCtx(null)
                    }}
                  >
                    {article.read ? <CircleDot size={14} /> : <Circle size={14} />}
                    {article.read
                      ? t.articleList.contextMenu.markAsUnread
                      : t.articleList.contextMenu.markAsRead}
                  </div>
                  <div
                    className="ctx-item"
                    onClick={() => {
                      navigator.clipboard.writeText(article.link)
                      setCtx(null)
                    }}
                  >
                    <Link2 size={14} />
                    {t.articleList.contextMenu.copyLink}
                  </div>
                  {getArticleImage(article) && (
                    <div
                      className="ctx-item"
                      onClick={async () => {
                        const img = getArticleImage(article)
                        if (img) await window.api.copyImageToClipboard(img)
                        setCtx(null)
                      }}
                    >
                      <Image size={14} />
                      {t.articleList.contextMenu.copyImage}
                    </div>
                  )}
                  <div
                    className="ctx-item"
                    onClick={() => {
                      window.api.openExternal(article.link)
                      setCtx(null)
                    }}
                  >
                    <ExternalLink size={14} />
                    {t.articleList.contextMenu.openInBrowser}
                  </div>
                </>
              )}
              <div
                className="ctx-item"
                onClick={() => {
                  const unreadIds = articles.filter((a) => !a.read).map((a) => a.id)
                  if (unreadIds.length > 0) {
                    useArticlesStore.getState().markMultipleRead(unreadIds, true)
                  }
                  setCtx(null)
                }}
              >
                <CheckCheck size={14} />
                {t.articleList.contextMenu.markAllAsRead}
              </div>
              <div className="ctx-divider" />
              {article && (
                <div
                  className="ctx-item danger"
                  onClick={() => {
                    deleteArticle(article.id)
                    setCtx(null)
                  }}
                >
                  <Trash2 size={14} />
                  {t.articleList.contextMenu.deleteArticle}
                </div>
              )}
              <div
                className="ctx-item danger"
                onClick={async () => {
                  const confirmed = await confirm({
                    title: t.articleList.dialogs.deleteAllTitle,
                    message: t.articleList.dialogs.deleteAllMsg,
                    confirmText: t.articleList.dialogs.deleteAllBtn,
                    cancelText: t.sidebar.cancel,
                    variant: 'danger'
                  })
                  if (confirmed) {
                    const ids = articles.map((a) => a.id)
                    if (ids.length > 0) {
                      useArticlesStore.getState().deleteMultiple(ids)
                    }
                  }
                  setCtx(null)
                }}
              >
                <Trash2 size={14} />
                {t.articleList.contextMenu.deleteAllArticles}
              </div>
            </div>
          )
        })()}

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  )
})

interface ArticleItemProps {
  article: Article
  selected: boolean
  onSelect: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
  style?: React.CSSProperties
  measureRef?: (el: HTMLElement | null) => void
  dataIndex?: number
}

const ArticleItem = memo(
  function ArticleItem({
    article,
    selected,
    onSelect,
    onContextMenu,
    style,
    measureRef,
    dataIndex
  }: ArticleItemProps) {
    const { markRead, starArticle } = useArticlesStore()
    const { settings } = useSettingsStore()
    const { t, language } = useTranslation()

    const handleClick = useCallback(() => {
      onSelect(article.id)
      if (!article.read) markRead(article.id, true)
    }, [article.id, article.read])

    const handleStar = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        starArticle(article.id, !article.starred)
      },
      [article.id, article.starred]
    )

    const absoluteTime = new Date(article.pubDate).toLocaleString(
      language === 'es' ? 'es-ES' : 'en-US',
      { dateStyle: 'medium', timeStyle: 'short' }
    )
    const dateTooltipLabel = t.notifier.receivedAt.replace('{time}', absoluteTime)

    return (
      <div
        ref={measureRef}
        data-index={dataIndex}
        className={`article-item ${selected ? 'active' : ''} ${article.read ? 'read' : ''}`}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, article.id)}
        style={style}
      >
        {/* Thumbnail strip */}
        {article.thumbnail && settings.showArticleThumbnails && (
          <div className="article-thumbnail">
            <img
              src={article.thumbnail}
              alt=""
              loading="lazy"
              onError={(e) => {
                ;(e.target as HTMLImageElement).parentElement!.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ marginTop: 1, flexShrink: 0 }}>
            <FeedFavicon icon={article.feedIcon} title={article.feedTitle} size={16} />
          </div>
          <span className="article-title" style={{ flex: 1 }}>
            {article.title}
          </span>
          <Tooltip
            label={article.starred ? t.articleViewer.unstar : t.articleViewer.star}
            placement="bottom"
          >
            <button onClick={handleStar} className="article-item-star">
              <Star
                size={13}
                fill={article.starred ? 'var(--star)' : 'none'}
                color={article.starred ? 'var(--star)' : 'var(--text-muted)'}
              />
            </button>
          </Tooltip>
        </div>

        {/* Snippet */}
        <div className="article-snippet">{article.snippet}</div>

        {/* Meta: unread dot + feed name + date */}
        <div className="article-meta">
          {!article.read ? (
            <Tooltip label={t.articleList.unread} placement="bottom">
              <div className="unread-dot" style={{ flexShrink: 0 }} />
            </Tooltip>
          ) : (
            <div style={{ width: 6, height: 6, flexShrink: 0 }} />
          )}
          <span
            style={{
              maxWidth: 90,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {article.feedTitle}
          </span>
          <span>·</span>
          <Tooltip label={dateTooltipLabel} placement="bottom">
            <span>{formatDate(article.pubDate, t)}</span>
          </Tooltip>
          {article.author && (
            <>
              <span>·</span>
              <span
                style={{
                  maxWidth: 80,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {article.author}
              </span>
            </>
          )}
        </div>
      </div>
    )
  },
  (prev, next) =>
    prev.article.id === next.article.id &&
    prev.article.read === next.article.read &&
    prev.article.starred === next.article.starred &&
    prev.selected === next.selected &&
    prev.style?.transform === next.style?.transform
)

export { FeedFavicon }
export default ArticleList

// Resolve the best copyable image for an article: prefer the feed thumbnail,
// otherwise fall back to the first <img> found inside the article content.
function getArticleImage(article: Article): string | null {
  if (article.thumbnail && typeof article.thumbnail === 'string') {
    return article.thumbnail
  }
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(article.content || '')
  return match ? match[1] : null
}
