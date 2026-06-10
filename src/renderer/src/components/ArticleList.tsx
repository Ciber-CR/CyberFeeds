import React, { memo, useRef, useCallback, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Star, Search, Filter, ChevronDown } from 'lucide-react'
import { useArticlesStore } from '../store/articles.store'
import { useUIStore } from '../store/ui.store'
import { useFeedsStore } from '../store/feeds.store'
import { useSettingsStore } from '../store/settings.store'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from './ConfirmDialog'
import type { Article } from '../types'
import { useTranslation } from '../hooks/useTranslation'

function formatDate(ts: number, t: any): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / 3600000
  if (diffH < 1) return `${Math.max(1, Math.round(diffMs / 60000))}${t.articleList.timeAgo.mAgo}`
  if (diffH < 24) return `${Math.round(diffH)}${t.articleList.timeAgo.hAgo}`
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
  const [failed, setFailed] = React.useState(false)
  const letter = (title || '?').charAt(0).toUpperCase()
  const colors = ['#58a6ff', '#3fb950', '#d29922', '#f0883e', '#bc8cff', '#39d353', '#e3b341', '#ff7b72']
  const color = colors[letter.charCodeAt(0) % colors.length]

  const avatarStyle: React.CSSProperties = {
    width: size, height: size, borderRadius: 3,
    background: color, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: Math.max(8, size * 0.6), fontWeight: 700,
    color: '#0d1117', flexShrink: 0, lineHeight: 1,
    userSelect: 'none'
  }

  if (!icon || failed) {
    return <span style={avatarStyle}>{letter}</span>
  }

  return (
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 3, objectFit: 'contain', flexShrink: 0, display: 'block' }}
      onError={() => setFailed(true)}
    />
  )
})

const ArticleList = memo(function ArticleList(): JSX.Element {
  const { articles, totalCount, loading, loadingMore, loadMore, deleteArticle, removeArticleFromList, markRead } = useArticlesStore()
  const { selectedArticleId, selectedFeedId, unreadOnly, search, selectArticle, setUnreadOnly, setSearch } = useUIStore()
  const [ctx, setCtx] = React.useState<{ x: number, y: number, id: string } | null>(null)
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
      const art = articles.find(a => a.id === prevId)
      if (art && art.read) {
        removeArticleFromList(prevId)
      }
    }
    prevSelectedId.current = selectedArticleId
  }, [selectedArticleId, unreadOnly, articles, removeArticleFromList])

  const selectedFeed = feeds.find(f => f.id === selectedFeedId)
  const title = selectedFeedId === 'starred' ? t.articleList.favorites : (selectedFeed?.title || t.articleList.allFeeds)

  const unreadDisplayCount = React.useMemo(() => {
    if (selectedFeedId === 'starred') return totalCount
    if (selectedFeedId === null) return Object.values(unreadCounts).reduce((a, b) => a + b, 0)
    if (selectedFeedId.startsWith('folder:')) {
      const folderId = selectedFeedId.split(':')[1]
      const folderFeeds = feeds.filter(f => f.folderId === folderId)
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

  // Count of articles below the current viewport (loaded + not yet loaded).
  const [belowCount, setBelowCount] = useState(0)
  const updateBelowCount = useCallback(() => {
    const el = parentRef.current
    if (!el) { setBelowCount(0); return }
    const bottom = el.scrollTop + el.clientHeight
    // Rendered items cover the viewport (plus overscan). The highest-index item
    // that starts above the viewport's bottom edge is the last visible one.
    let lastVisible = -1
    for (const it of rowVirtualizer.getVirtualItems()) {
      if (it.start < bottom) lastVisible = Math.max(lastVisible, it.index)
    }
    if (lastVisible < 0) { setBelowCount(0); return }
    setBelowCount(Math.max(0, totalCount - (lastVisible + 1)))
  }, [rowVirtualizer, totalCount])

  useEffect(() => {
    const items = rowVirtualizer.getVirtualItems()
    updateBelowCount()
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
    window.addEventListener('click', handleUp)
    return () => window.removeEventListener('click', handleUp)
  }, [])

  return (
    <div className="article-list-pane" onContextMenu={e => e.preventDefault()}>
      {/* Header */}
      <div className="article-list-header">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {selectedFeedId === 'starred' ? (
            <Star size={16} fill="var(--star)" color="var(--star)" style={{ marginRight: 4 }} />
          ) : selectedFeed?.icon && (
            <FeedFavicon icon={selectedFeed.icon} title={selectedFeed.title} size={16} />
          )}
          <h2 style={{ 
            marginLeft: (selectedFeedId === 'starred' || selectedFeed?.icon) ? 4 : 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>{title}</h2>
        </div>

        <div 
          className="cyber-badge no-brackets"
          onClick={() => togglePolling()}
          title={language === 'es'
            ? `Sondeo: ${settings.pollingEnabled ? 'ENCENDIDO' : 'APAGADO'} | Sin leer: ${unreadDisplayCount} | Total: ${totalCount} | Clic para alternar`
            : `Polling: ${settings.pollingEnabled ? 'ON' : 'OFF'} | Unread: ${unreadDisplayCount} | Total: ${totalCount} | Click to toggle`}
          style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', flexShrink: 0, margin: '0 10px', gap: 8, padding: '3px 10px' }}
        >
          <span style={{ 
            fontSize: 9, 
            fontWeight: 700, 
            color: settings.pollingEnabled ? 'var(--accent)' : 'var(--text-muted)',
            opacity: 0.8
          }}>
            {settings.pollingEnabled ? t.articleList.monitoring : t.articleList.paused}
          </span>
          <span style={{ 
            width: 7, height: 7, borderRadius: '50%', 
            background: settings.pollingEnabled ? 'var(--accent)' : '#444', 
            boxShadow: settings.pollingEnabled ? '0 0 6px var(--accent)' : 'none', 
            animation: settings.pollingEnabled ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{ opacity: 0.8, marginLeft: 4 }}>
            [{unreadOnly ? unreadDisplayCount : `${unreadDisplayCount} / ${totalCount}`}]
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setUnreadOnly(!unreadOnly)}
            title={unreadOnly ? t.articleList.showAll : t.articleList.unreadOnly}
            style={unreadOnly ? { color: 'var(--accent)' } : undefined}
          >
            <Filter size={14} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-muted)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
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
      <div className="article-list-scroll" ref={parentRef}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="spinner" />
          </div>
        ) : articles.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {t.articleList.noArticles}
          </div>
        ) : (
          <div className="article-virtual-inner" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const article = articles[virtualRow.index]
              return (
                  <ArticleItem
                    key={article.id}
                    article={article}
                    selected={selectedArticleId === article.id}
                    onSelect={selectArticle}
                    onContextMenu={(e, id) => {
                      e.preventDefault()
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
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 170, 255, 0.65)',
            border: '1px solid rgba(0, 170, 255, 0.5)',
            borderRadius: 12,
            padding: '3px 12px',
            fontSize: 10,
            fontWeight: 600,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            zIndex: 10,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            pointerEvents: 'none'
          }}
        >
          <ChevronDown size={10} />
          {belowCount} {t.articleList.moreBelow}
        </div>
      )}

      {ctx && (() => {
        const article = articles.find(a => a.id === ctx.id)
        return (
          <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} onClick={e => e.stopPropagation()}>
            {article && (
              <>
                <div className="ctx-item" onClick={() => {
                  markRead(article.id, !article.read)
                  setCtx(null)
                }}>
                  {article.read ? t.articleList.contextMenu.markAsUnread : t.articleList.contextMenu.markAsRead}
                </div>
                <div className="ctx-item" onClick={() => {
                  navigator.clipboard.writeText(article.link)
                  setCtx(null)
                }}>
                  {t.articleList.contextMenu.copyLink}
                </div>
                <div className="ctx-item" onClick={() => {
                  window.api.openExternal(article.link)
                  setCtx(null)
                }}>
                  {t.articleList.contextMenu.openInBrowser}
                </div>
                <div className="ctx-divider" />
                <div className="ctx-item danger" onClick={() => {
                  deleteArticle(article.id)
                  setCtx(null)
                }}>
                  {t.articleList.contextMenu.deleteArticle}
                </div>
                <div className="ctx-divider" />
              </>
            )}
            <div className="ctx-item" onClick={() => {
              const unreadIds = articles.filter(a => !a.read).map(a => a.id)
              if (unreadIds.length > 0) {
                useArticlesStore.getState().markMultipleRead(unreadIds, true)
              }
              setCtx(null)
            }}>
              {t.articleList.contextMenu.markAllAsRead}
            </div>
            <div className="ctx-item danger" onClick={async () => {
              const confirmed = await confirm({
                title: t.articleList.dialogs.deleteAllTitle,
                message: t.articleList.dialogs.deleteAllMsg,
                confirmText: t.articleList.dialogs.deleteAllBtn,
                cancelText: t.sidebar.cancel,
                variant: 'danger'
              })
              if (confirmed) {
                const ids = articles.map(a => a.id)
                if (ids.length > 0) {
                  useArticlesStore.getState().deleteMultiple(ids)
                }
              }
              setCtx(null)
            }}>
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

const ArticleItem = memo(function ArticleItem({ article, selected, onSelect, onContextMenu, style, measureRef, dataIndex }: ArticleItemProps) {
  const { markRead, starArticle } = useArticlesStore()
  const { settings } = useSettingsStore()
  const { t } = useTranslation()

  const handleClick = useCallback(() => {
    onSelect(article.id)
    if (!article.read) markRead(article.id, true)
  }, [article.id, article.read])

  const handleStar = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    starArticle(article.id, !article.starred)
  }, [article.id, article.starred])

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
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
          />
        </div>
      )}

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ marginTop: 1, flexShrink: 0 }}>
          <FeedFavicon icon={article.feedIcon} title={article.feedTitle} size={16} />
        </div>
        <span className="article-title" style={{ flex: 1 }}>{article.title}</span>
        <button
          onClick={handleStar}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, marginTop: 1 }}
        >
          <Star size={13} fill={article.starred ? 'var(--star)' : 'none'} color={article.starred ? 'var(--star)' : 'var(--text-muted)'} />
        </button>
      </div>

      {/* Snippet */}
      <div className="article-snippet">{article.snippet}</div>

      {/* Meta: unread dot + feed name + date */}
      <div className="article-meta">
        {!article.read && <div className="unread-dot" style={{ flexShrink: 0 }} />}
        {article.read && <div style={{ width: 6, height: 6, flexShrink: 0 }} />}
        <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {article.feedTitle}
        </span>
        <span>·</span>
        <span>{formatDate(article.pubDate, t)}</span>
        {article.author && (
          <>
            <span>·</span>
            <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {article.author}
            </span>
          </>
        )}
      </div>
    </div>
  )
}, (prev, next) =>
  prev.article.id === next.article.id &&
  prev.article.read === next.article.read &&
  prev.article.starred === next.article.starred &&
  prev.selected === next.selected &&
  prev.style?.transform === next.style?.transform
)

export { FeedFavicon }
export default ArticleList
