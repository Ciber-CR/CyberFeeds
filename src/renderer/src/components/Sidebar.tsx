import React, { memo, useState, useCallback } from 'react'
import {
  FolderPlus,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Plus,
  Upload,
  Download,
  Stethoscope,
  Rss,
  CircleDot,
  Star,
  RefreshCw,
  Pencil,
  Pause,
  Play,
  Trash2
} from 'lucide-react'
import { useFeedsStore } from '../store/feeds.store'
import { useUIStore } from '../store/ui.store'
import { FeedFavicon } from './ArticleList'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from './ConfirmDialog'
import type { Feed, Folder } from '../types'
import { useTranslation } from '../hooks/useTranslation'
import Tooltip from './Tooltip'

const formatNum = (val: number): string => String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

function formatCountBreakdown(
  unread: number,
  total: number,
  t: { sidebar: { unreadCount: string; readCountOne: string; readCountMany: string } }
): string {
  const read = Math.max(0, total - unread)
  const readWord = read === 1 ? t.sidebar.readCountOne : t.sidebar.readCountMany
  return `${formatNum(unread)} ${t.sidebar.unreadCount} ⋅ ${formatNum(read)} ${readWord}`
}

const MIN_REFRESH_INDICATOR_MS = 700

async function waitForMinimumRefreshTime(startedAt: number): Promise<void> {
  const remaining = MIN_REFRESH_INDICATOR_MS - (Date.now() - startedAt)
  if (remaining > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, remaining))
  }
}

const Sidebar = memo(function Sidebar(): JSX.Element {
  const {
    feeds,
    folders,
    unreadCounts,
    articleCounts,
    loadAll,
    deleteFeed,
    fetchFeed,
    fetchFolder,
    togglePauseFeed,
    togglePauseFolder,
    deleteFolder
  } = useFeedsStore()
  const { selectedFeedId, unreadOnly, selectFeed, openPanel } = useUIStore()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [refreshingFeedIds, setRefreshingFeedIds] = useState<Set<string>>(new Set())
  const [refreshingFolderIds, setRefreshingFolderIds] = useState<Set<string>>(new Set())
  const [ctx, setCtx] = React.useState<{
    x: number
    y: number
    type: 'feed' | 'folder'
    id: string
  } | null>(null)
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm()
  const { t } = useTranslation()

  React.useEffect(() => {
    const handleUp = () => setCtx(null)
    const handleOtherMenu = (e: Event): void => {
      if ((e as CustomEvent<string>).detail !== 'sidebar') setCtx(null)
    }
    window.addEventListener('click', handleUp)
    window.addEventListener('cyberfeeds:close-context-menus', handleOtherMenu)
    return () => {
      window.removeEventListener('click', handleUp)
      window.removeEventListener('cyberfeeds:close-context-menus', handleOtherMenu)
    }
  }, [])

  const totalAll = unreadCounts['all'] || 0
  const totalUnread = Object.entries(unreadCounts)
    .filter(([k]) => k !== 'starred' && k !== 'all')
    .reduce((sum, [, count]) => sum + count, 0)

  const totalStarred = unreadCounts['starred'] || 0

  const toggleFolder = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => setCollapsed(new Set()), [])
  const collapseAll = useCallback(() => setCollapsed(new Set(folders.map((f) => f.id))), [folders])

  const toggleAll = useCallback(() => {
    if (collapsed.size > 0) expandAll()
    else collapseAll()
  }, [collapsed.size, expandAll, collapseAll])

  const handleAddFolder = useCallback(() => {
    openPanel('addFolder')
  }, [openPanel])

  const handleImportOpml = useCallback(async () => {
    setImporting(true)
    setImportMsg('')
    try {
      const result = await window.api.importOpml()
      if (result.canceled) {
        setImporting(false)
        return
      }
      await loadAll()
      setImportMsg(`✓ ${result.added} ${t.sidebar.feedsAdded}`)
      setTimeout(() => setImportMsg(''), 3000)
    } catch {
      setImportMsg(t.sidebar.importFailed)
      setTimeout(() => setImportMsg(''), 3000)
    }
    setImporting(false)
  }, [loadAll, t])

  const handleRefreshFeed = useCallback(async (id: string) => {
    const startedAt = Date.now()
    setRefreshingFeedIds((prev) => new Set(prev).add(id))
    try {
      await fetchFeed(id)
    } finally {
      await waitForMinimumRefreshTime(startedAt)
      setRefreshingFeedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [fetchFeed])

  const handleRefreshFolder = useCallback(async (id: string) => {
    const startedAt = Date.now()
    setRefreshingFolderIds((prev) => new Set(prev).add(id))
    try {
      await fetchFolder(id)
    } finally {
      await waitForMinimumRefreshTime(startedAt)
      setRefreshingFolderIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [fetchFolder])

  const sortedFolders = React.useMemo(
    () => [...folders].sort((a, b) => a.name.localeCompare(b.name)),
    [folders]
  )
  const sortedFeeds = React.useMemo(
    () => [...feeds].sort((a, b) => a.title.localeCompare(b.title)),
    [feeds]
  )

  const unfiledFeeds = sortedFeeds.filter((f) => !f.folderId || f.folderId === '')

  return (
    <div className="sidebar" onContextMenu={(e) => e.preventDefault()}>
      <div className="sidebar-scroll">
        {/* All Articles */}
        <div
          className={`sidebar-item ${selectedFeedId === null && !unreadOnly ? 'active' : ''}`}
          onClick={() => selectFeed(null, { unreadOnly: false })}
        >
          <Rss size={15} style={{ color: '#EF8021', flexShrink: 0 }} />
          <span className="item-label">{t.sidebar.allFeeds}</span>
          {totalAll > 0 && (
            <Tooltip label={formatCountBreakdown(totalUnread, totalAll, t)} placement="right">
              <div className="cyber-badge" style={{ fontSize: 9, padding: '1px 4px' }}>
                {formatNum(totalAll)}
              </div>
            </Tooltip>
          )}
        </div>

        <div
          className={`sidebar-item ${selectedFeedId === null && unreadOnly ? 'active' : ''}`}
          onClick={() => selectFeed(null, { unreadOnly: true })}
        >
          <CircleDot size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span className="item-label">{t.sidebar.unreadArticles}</span>
          {totalUnread > 0 && (
            <Tooltip label={formatCountBreakdown(totalUnread, totalAll, t)} placement="right">
              <div className="cyber-badge" style={{ fontSize: 9, padding: '1px 4px' }}>
                {formatNum(totalUnread)}
              </div>
            </Tooltip>
          )}
        </div>

        <div
          className={`sidebar-item ${selectedFeedId === 'starred' ? 'active' : ''}`}
          onClick={() => selectFeed('starred')}
        >
          <Star size={15} style={{ color: 'var(--star)', fill: 'var(--star)', flexShrink: 0 }} />
          <span className="item-label">{t.sidebar.favorites}</span>
          {totalStarred > 0 && (
            <div className="cyber-badge" style={{ fontSize: 9, padding: '1px 4px' }}>
              {formatNum(totalStarred)}
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Folders */}
        {sortedFolders.map((folder) => (
          <React.Fragment key={folder.id}>
            <FolderSection
              folder={folder}
              feeds={sortedFeeds.filter((f) => f.folderId === folder.id)}
              collapsed={collapsed.has(folder.id)}
              onToggle={toggleFolder}
              selectedFeedId={selectedFeedId}
              contextActive={ctx?.type === 'folder' && ctx.id === folder.id}
              contextFeedId={ctx?.type === 'feed' ? ctx.id : null}
              refreshingFolder={refreshingFolderIds.has(folder.id)}
              refreshingFeedIds={refreshingFeedIds}
              onSelect={selectFeed}
              unreadCounts={unreadCounts}
              articleCounts={articleCounts}
              onContextMenu={(e, type, id) => {
                e.preventDefault()
                window.dispatchEvent(
                  new CustomEvent('cyberfeeds:close-context-menus', { detail: 'sidebar' })
                )
                setCtx({ x: e.clientX, y: e.clientY, type, id })
              }}
            />
          </React.Fragment>
        ))}

        {/* Unfiled */}
        {unfiledFeeds.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {unfiledFeeds.map((feed) => (
              <FeedItem
                key={feed.id}
                feed={feed}
                selected={selectedFeedId === feed.id}
                contextActive={ctx?.type === 'feed' && ctx.id === feed.id}
                refreshing={refreshingFeedIds.has(feed.id)}
                onSelect={selectFeed}
                unread={unreadCounts[feed.id] || 0}
                total={articleCounts[feed.id] || 0}
                onContextMenu={(e, id) => {
                  e.preventDefault()
                  window.dispatchEvent(
                    new CustomEvent('cyberfeeds:close-context-menus', { detail: 'sidebar' })
                  )
                  setCtx({ x: e.clientX, y: e.clientY, type: 'feed', id })
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Actions — single row */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border-muted)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {/* Toggle All Expand/Collapse */}
          <Tooltip
            label={collapsed.size > 0 ? t.sidebar.expandAll : t.sidebar.collapseAll}
            placement="top"
          >
            <button
              className="add-feed-btn"
              style={{ flex: 0, padding: '6px 8px' }}
              onClick={toggleAll}
            >
              {collapsed.size > 0 ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
            </button>
          </Tooltip>

          <Tooltip label={t.sidebar.newFolder} placement="top">
            <button
              className="add-feed-btn"
              style={{ flex: 0, padding: '6px 8px' }}
              onClick={handleAddFolder}
            >
              <FolderPlus size={13} />
            </button>
          </Tooltip>

          <button className="add-feed-btn" style={{ flex: 1 }} onClick={() => openPanel('addFeed')}>
            <Plus size={13} />
            {t.sidebar.addFeed}
          </button>
          <Tooltip label={t.sidebar.importOpml} placement="top">
            <button
              className="add-feed-btn"
              style={{ flex: 0, padding: '6px 8px' }}
              onClick={handleImportOpml}
              disabled={importing}
            >
              {importing ? (
                <div className="spinner" style={{ width: 12, height: 12 }} />
              ) : (
                <Upload size={13} />
              )}
            </button>
          </Tooltip>
          <Tooltip label={t.sidebar.exportOpml} placement="top">
            <button
              className="add-feed-btn"
              style={{ flex: 0, padding: '6px 8px' }}
              onClick={() => window.api.exportOpml()}
            >
              <Download size={13} />
            </button>
          </Tooltip>
          <Tooltip label={t.sidebar.feedsDoctor} placement="top">
            <button
              className="add-feed-btn"
              style={{ flex: 0, padding: '6px 8px' }}
              onClick={() => openPanel('doctor')}
            >
              <Stethoscope size={13} />
            </button>
          </Tooltip>
        </div>

        {importMsg && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--green)',
              textAlign: 'center',
              padding: '4px 0',
              marginTop: 2
            }}
          >
            {importMsg}
          </div>
        )}
      </div>

      {ctx && (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: Math.min(ctx.y, window.innerHeight - 160) }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctx.type === 'feed' ? (
            <>
              <div
                className="ctx-item"
                onClick={() => {
                  void handleRefreshFeed(ctx.id)
                  setCtx(null)
                }}
              >
                <RefreshCw size={14} />
                {t.sidebar.refreshFeed}
              </div>
              <div
                className="ctx-item"
                onClick={() => {
                  openPanel('editFeed', ctx.id)
                  setCtx(null)
                }}
              >
                <Pencil size={14} />
                {t.sidebar.editFeed}
              </div>
              <div
                className="ctx-item"
                onClick={() => {
                  togglePauseFeed(ctx.id)
                  setCtx(null)
                }}
              >
                {feeds.find((f) => f.id === ctx.id)?.disabled ? (
                  <>
                    <Play size={14} />
                    {t.sidebar.resumeFeed}
                  </>
                ) : (
                  <>
                    <Pause size={14} />
                    {t.sidebar.pauseFeed}
                  </>
                )}
              </div>
              <div className="ctx-divider" />
              <div
                className="ctx-item danger"
                onClick={async () => {
                  const feed = feeds.find((f) => f.id === ctx.id)
                  if (feed) {
                    const confirmed = await confirm({
                      title: t.sidebar.deleteFeedTitle,
                      message: t.sidebar.deleteFeedMsg.replace('{title}', feed.title),
                      confirmText: t.sidebar.delete,
                      cancelText: t.sidebar.cancel,
                      variant: 'danger'
                    })
                    if (confirmed) {
                      await deleteFeed(ctx.id)
                    }
                  }
                  setCtx(null)
                }}
              >
                <Trash2 size={14} />
                {t.sidebar.deleteFeed}
              </div>
            </>
          ) : (
            <>
              <div
                className="ctx-item"
                onClick={() => {
                  void handleRefreshFolder(ctx.id)
                  setCtx(null)
                }}
              >
                <RefreshCw size={14} />
                {t.sidebar.refreshFolder}
              </div>
              <div
                className="ctx-item"
                onClick={() => {
                  openPanel('editFolder', ctx.id)
                  setCtx(null)
                }}
              >
                <Pencil size={14} />
                {t.sidebar.renameFolder}
              </div>
              <div
                className="ctx-item"
                onClick={() => {
                  togglePauseFolder(ctx.id)
                  setCtx(null)
                }}
              >
                {feeds.filter((f) => f.folderId === ctx.id)[0]?.disabled ? (
                  <>
                    <Play size={14} />
                    {t.sidebar.resumeFolder}
                  </>
                ) : (
                  <>
                    <Pause size={14} />
                    {t.sidebar.pauseFolder}
                  </>
                )}
              </div>
              <div className="ctx-divider" />
              <div
                className="ctx-item danger"
                onClick={async () => {
                  const folder = folders.find((f) => f.id === ctx.id)
                  if (folder) {
                    const confirmed = await confirm({
                      title: t.sidebar.deleteFolderTitle,
                      message: t.sidebar.deleteFolderMsg.replace('{name}', folder.name),
                      confirmText: t.sidebar.delete,
                      cancelText: t.sidebar.cancel,
                      variant: 'danger'
                    })
                    if (confirmed) {
                      await deleteFolder(ctx.id)
                    }
                  }
                  setCtx(null)
                }}
              >
                <Trash2 size={14} />
                {t.sidebar.deleteFolder}
              </div>
            </>
          )}
        </div>
      )}

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

interface FolderSectionProps {
  folder: Folder
  feeds: Feed[]
  collapsed: boolean
  onToggle: (id: string) => void
  selectedFeedId: string | null
  contextActive: boolean
  contextFeedId: string | null
  refreshingFolder: boolean
  refreshingFeedIds: Set<string>
  onSelect: (id: string | null) => void
  unreadCounts: Record<string, number>
  articleCounts: Record<string, number>
  onContextMenu: (e: React.MouseEvent, type: 'feed' | 'folder', id: string) => void
}

const FolderSection = memo(function FolderSection({
  folder,
  feeds,
  collapsed,
  onToggle,
  selectedFeedId,
  contextActive,
  contextFeedId,
  refreshingFolder,
  refreshingFeedIds,
  onSelect,
  unreadCounts,
  articleCounts,
  onContextMenu
}: FolderSectionProps) {
  const { t } = useTranslation()
  const folderUnread = feeds.reduce((sum, f) => sum + (unreadCounts[f.id] || 0), 0)
  const folderTotal = feeds.reduce((sum, f) => sum + (articleCounts[f.id] || 0), 0)

  return (
    <div>
      <div
        className={`folder-header ${contextActive ? 'context-active' : ''}`}
        onClick={() => onToggle(folder.id)}
        onContextMenu={(e) => onContextMenu(e, 'folder', folder.id)}
      >
        {refreshingFolder ? (
          <RefreshCw className="feed-refresh-icon" size={14} />
        ) : collapsed ? (
          <ChevronRight size={14} />
        ) : (
          <ChevronDown size={14} />
        )}
        <span className="folder-name">{folder.name}</span>
        {folderUnread > 0 && (
          <Tooltip label={formatCountBreakdown(folderUnread, folderTotal, t)} placement="right">
            <div className="cyber-badge folder-badge">{formatNum(folderUnread)}</div>
          </Tooltip>
        )}
      </div>
      {!collapsed &&
        feeds.map((feed) => (
          <FeedItem
            key={feed.id}
            feed={feed}
            selected={selectedFeedId === feed.id}
            contextActive={contextFeedId === feed.id}
            refreshing={refreshingFolder || refreshingFeedIds.has(feed.id)}
            onSelect={onSelect}
            unread={unreadCounts[feed.id] || 0}
            total={articleCounts[feed.id] || 0}
            onContextMenu={(e, id) => onContextMenu(e, 'feed', id)}
            indent
          />
        ))}
    </div>
  )
})

interface FeedItemProps {
  feed: Feed
  selected: boolean
  contextActive: boolean
  refreshing: boolean
  onSelect: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, feedId: string) => void
  unread: number
  total: number
  indent?: boolean
}

const FeedItem = memo(function FeedItem({
  feed,
  selected,
  contextActive,
  refreshing,
  onSelect,
  onContextMenu,
  unread,
  total,
  indent
}: FeedItemProps) {
  const { t } = useTranslation()
  return (
    <Tooltip
      label={feed.title + (feed.disabled ? ` (${t.articleList.paused.toLowerCase()})` : '')}
      placement="right"
    >
      <div
        className={`sidebar-item ${selected ? 'active' : ''} ${contextActive ? 'context-active' : ''} ${feed.disabled ? 'paused' : ''}`}
        style={indent ? { paddingLeft: 24 } : undefined}
        onClick={() => onSelect(feed.id)}
        onContextMenu={(e) => onContextMenu?.(e, feed.id)}
      >
        {/* Favicon BEFORE title, with colored letter fallback */}
        <div style={{ opacity: feed.disabled ? 0.5 : 1 }}>
          {refreshing ? (
            <RefreshCw className="feed-refresh-icon" size={15} />
          ) : (
            <FeedFavicon icon={feed.icon} title={feed.title} size={15} />
          )}
        </div>
        <span
          className="item-label"
          style={{
            fontStyle: feed.disabled ? 'italic' : 'normal',
            opacity: feed.disabled ? 0.6 : 1
          }}
        >
          {feed.title}
        </span>
        {unread > 0 && (
          <Tooltip label={formatCountBreakdown(unread, total, t)} placement="right">
            <div
              className="cyber-badge"
              style={{ fontSize: 9, padding: '1px 4px', opacity: feed.disabled ? 0.5 : 1 }}
            >
              {formatNum(unread)}
            </div>
          </Tooltip>
        )}
      </div>
    </Tooltip>
  )
})

export default Sidebar
