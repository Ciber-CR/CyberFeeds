import React, { memo, useRef, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Star, Search, Filter } from 'lucide-react'
import { useArticlesStore } from '../store/articles.store'
import { useUIStore } from '../store/ui.store'
import { useFeedsStore } from '../store/feeds.store'
import { useSettingsStore } from '../store/settings.store'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from './ConfirmDialog'
import type { Article } from '../types'

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / 3600000
  if (diffH < 1) return `${Math.max(1, Math.round(diffMs / 60000))}m ago`
  if (diffH < 24) return `${Math.round(diffH)}h ago`
  if (diffH < 48) return 'Yesterday'
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
  const title = selectedFeedId === 'starred' ? 'Favorites' : (selectedFeed?.title || 'All Feeds')

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
          title={`Polling: ${settings.pollingEnabled ? 'ON' : 'OFF'} | Unread: ${unreadDisplayCount} | Total: ${totalCount} | Click to toggle`}
          style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', flexShrink: 0, margin: '0 10px', gap: 8, padding: '3px 10px' }}
        >
          <span style={{ 
            fontSize: 9, 
            fontWeight: 700, 
            color: settings.pollingEnabled ? 'var(--accent)' : 'var(--text-muted)',
            opacity: 0.8
          }}>
            {settings.pollingEnabled ? 'MONITORING' : 'PAUSED'}
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
            title={unreadOnly ? 'Show all' : 'Unread only'}
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
            placeholder="Search articles..."
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
            No articles
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
                  {article.read ? 'Mark as unread' : 'Mark as read'}
                </div>
                <div className="ctx-item" onClick={() => {
                  navigator.clipboard.writeText(article.link)
                  setCtx(null)
                }}>
                  Copy link
                </div>
                <div className="ctx-item" onClick={() => {
                  window.api.openExternal(article.link)
                  setCtx(null)
                }}>
                  Open in browser
                </div>
                <div className="ctx-divider" />
                <div className="ctx-item danger" onClick={() => {
                  deleteArticle(article.id)
                  setCtx(null)
                }}>
                  Delete article
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
              Mark all as read
            </div>
            <div className="ctx-item danger" onClick={async () => {
              const confirmed = await confirm({
                title: 'Delete All Articles',
                message: 'Are you sure you want to delete all articles in the current list? This action cannot be undone.',
                confirmText: 'Delete All',
                cancelText: 'Cancel',
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
              Delete all articles
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
        <span>{formatDate(article.pubDate)}</span>
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
