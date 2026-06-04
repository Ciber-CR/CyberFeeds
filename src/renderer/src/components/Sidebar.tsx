import React, { memo, useState, useCallback } from 'react'
import { FolderPlus, ChevronRight, ChevronDown, ChevronsUpDown, ChevronsDownUp, Plus, Upload, Download, Stethoscope, Rss, Star } from 'lucide-react'
import { useFeedsStore } from '../store/feeds.store'
import { useUIStore } from '../store/ui.store'
import { FeedFavicon } from './ArticleList'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from './ConfirmDialog'
import type { Feed, Folder } from '../types'
import { useTranslation } from '../hooks/useTranslation'

const Sidebar = memo(function Sidebar(): JSX.Element {
  const { feeds, folders, unreadCounts, loadAll, deleteFeed, fetchFeed, fetchFolder, togglePauseFeed, togglePauseFolder, deleteFolder } = useFeedsStore()
  const { selectedFeedId, selectFeed, openPanel } = useUIStore()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [ctx, setCtx] = React.useState<{ x: number, y: number, type: 'feed' | 'folder', id: string } | null>(null)
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm()
  const { t } = useTranslation()

  React.useEffect(() => {
    const handleUp = () => setCtx(null)
    window.addEventListener('click', handleUp)
    return () => window.removeEventListener('click', handleUp)
  }, [])

  const totalUnread = Object.entries(unreadCounts)
    .filter(([k]) => k !== 'starred')
    .reduce((sum, [, count]) => sum + count, 0)
  
  const totalStarred = unreadCounts['starred'] || 0

  const toggleFolder = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => setCollapsed(new Set()), [])
  const collapseAll = useCallback(() => setCollapsed(new Set(folders.map(f => f.id))), [folders])

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
      if (result.canceled) { setImporting(false); return }
      await loadAll()
      setImportMsg(`✓ ${result.added} ${t.sidebar.feedsAdded}`)
      setTimeout(() => setImportMsg(''), 3000)
    } catch {
      setImportMsg(t.sidebar.importFailed)
      setTimeout(() => setImportMsg(''), 3000)
    }
    setImporting(false)
  }, [loadAll, t])

  const sortedFolders = React.useMemo(() => [...folders].sort((a, b) => a.name.localeCompare(b.name)), [folders])
  const sortedFeeds = React.useMemo(() => [...feeds].sort((a, b) => a.title.localeCompare(b.title)), [feeds])

  const unfiledFeeds = sortedFeeds.filter(f => !f.folderId || f.folderId === '')

  return (
    <div className="sidebar" onContextMenu={e => e.preventDefault()}>
      <div className="sidebar-scroll">
        {/* All Feeds */}
        <div
          className={`sidebar-item ${selectedFeedId === null ? 'active' : ''}`}
          onClick={() => selectFeed(null)}
        >
          <Rss size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span className="item-label">{t.sidebar.allFeeds}</span>
          {totalUnread > 0 && (
            <div className="cyber-badge" style={{ fontSize: 9, padding: '1px 4px' }}>
              {totalUnread}
            </div>
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
              {totalStarred}
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Folders */}
        {sortedFolders.map((folder, index) => (
          <React.Fragment key={folder.id}>
            <FolderSection
              folder={folder}
              feeds={sortedFeeds.filter(f => f.folderId === folder.id)}
              collapsed={collapsed.has(folder.id)}
              onToggle={toggleFolder}
              selectedFeedId={selectedFeedId}
              onSelect={selectFeed}
              unreadCounts={unreadCounts}
              onContextMenu={(e, type, id) => {
                e.preventDefault()
                setCtx({ x: e.clientX, y: e.clientY, type, id })
              }}
            />
            {index < sortedFolders.length - 1 && <div className="folder-divider" />}
          </React.Fragment>
        ))}

        {/* Unfiled */}
        {unfiledFeeds.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {unfiledFeeds.map(feed => (
              <FeedItem
                key={feed.id}
                feed={feed}
                selected={selectedFeedId === feed.id}
                onSelect={selectFeed}
                unread={unreadCounts[feed.id] || 0}
                onContextMenu={(e, id) => {
                  e.preventDefault()
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
          <button
            className="add-feed-btn"
            style={{ flex: 0, padding: '6px 8px' }}
            onClick={toggleAll}
            title={collapsed.size > 0 ? t.sidebar.expandAll : t.sidebar.collapseAll}
          >
            {collapsed.size > 0 ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
          </button>

          <button
            className="add-feed-btn"
            style={{ flex: 0, padding: '6px 8px' }}
            onClick={handleAddFolder}
            title={t.sidebar.newFolder}
          >
            <FolderPlus size={13} />
          </button>

          <button className="add-feed-btn" style={{ flex: 1 }} onClick={() => openPanel('addFeed')}>
            <Plus size={13} />
            {t.sidebar.addFeed}
          </button>
          <button
            className="add-feed-btn"
            style={{ flex: 0, padding: '6px 8px' }}
            onClick={handleImportOpml}
            disabled={importing}
            title={t.sidebar.importOpml}
          >
            {importing
              ? <div className="spinner" style={{ width: 12, height: 12 }} />
              : <Upload size={13} />
            }
          </button>
          <button
            className="add-feed-btn"
            style={{ flex: 0, padding: '6px 8px' }}
            onClick={() => window.api.exportOpml()}
            title={t.sidebar.exportOpml}
          >
            <Download size={13} />
          </button>
          <button
            className="add-feed-btn"
            style={{ flex: 0, padding: '6px 8px' }}
            onClick={() => openPanel('doctor')}
            title={t.sidebar.feedsDoctor}
          >
            <Stethoscope size={13} />
          </button>
        </div>

        {importMsg && (
          <div style={{ fontSize: 11, color: 'var(--green)', textAlign: 'center', padding: '4px 0', marginTop: 2 }}>
            {importMsg}
          </div>
        )}
      </div>

      {ctx && (
        <div 
          className="ctx-menu" 
          style={{ 
            left: ctx.x, 
            top: Math.min(ctx.y, window.innerHeight - 130) 
          }} 
          onClick={e => e.stopPropagation()}
        >
          {ctx.type === 'feed' ? (
            <>
              <div className="ctx-item" onClick={() => {
                fetchFeed(ctx.id)
                setCtx(null)
              }}>
                {t.sidebar.refreshFeed}
              </div>
              <div className="ctx-item" onClick={() => {
                openPanel('editFeed', ctx.id)
                setCtx(null)
              }}>
                {t.sidebar.editFeed}
              </div>
              <div className="ctx-item" onClick={() => {
                togglePauseFeed(ctx.id)
                setCtx(null)
              }}>
                {feeds.find(f => f.id === ctx.id)?.disabled ? t.sidebar.resumeFeed : t.sidebar.pauseFeed}
              </div>
              <div className="ctx-divider" />
              <div className="ctx-item danger" onClick={async () => {
                const feed = feeds.find(f => f.id === ctx.id)
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
              }}>
                {t.sidebar.deleteFeed}
              </div>
            </>
          ) : (
            <>
              <div className="ctx-item" onClick={() => {
                fetchFolder(ctx.id)
                setCtx(null)
              }}>
                {t.sidebar.refreshFolder}
              </div>
              <div className="ctx-item" onClick={() => {
                openPanel('editFolder', ctx.id)
                setCtx(null)
              }}>
                {t.sidebar.renameFolder}
              </div>
              <div className="ctx-item" onClick={() => {
                togglePauseFolder(ctx.id)
                setCtx(null)
              }}>
                {feeds.filter(f => f.folderId === ctx.id)[0]?.disabled ? t.sidebar.resumeFolder : t.sidebar.pauseFolder}
              </div>
              <div className="ctx-divider" />
              <div className="ctx-item danger" onClick={async () => {
                const folder = folders.find(f => f.id === ctx.id)
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
              }}>
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
  onSelect: (id: string | null) => void
  unreadCounts: Record<string, number>
  onContextMenu: (e: React.MouseEvent, type: 'feed' | 'folder', id: string) => void
}

const FolderSection = memo(function FolderSection({
  folder, feeds, collapsed, onToggle, selectedFeedId, onSelect, unreadCounts, onContextMenu
}: FolderSectionProps) {
  const folderUnread = feeds.reduce((sum, f) => sum + (unreadCounts[f.id] || 0), 0)

  return (
    <div>
      <div className="folder-header"
        onClick={() => onToggle(folder.id)}
        onContextMenu={(e) => onContextMenu(e, 'folder', folder.id)}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <span className="folder-name">
          {folder.name}
        </span>
        {folderUnread > 0 && (
          <div className="cyber-badge folder-badge">
            {folderUnread}
          </div>
        )}
      </div>
      {!collapsed && feeds.map(feed => (
        <FeedItem
          key={feed.id}
          feed={feed}
          selected={selectedFeedId === feed.id}
          onSelect={onSelect}
          unread={unreadCounts[feed.id] || 0}
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
  onSelect: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, feedId: string) => void
  unread: number
  indent?: boolean
}

const FeedItem = memo(function FeedItem({ feed, selected, onSelect, onContextMenu, unread, indent }: FeedItemProps) {
    const { t } = useTranslation()
    return (
      <div
        className={`sidebar-item ${selected ? 'active' : ''} ${feed.disabled ? 'paused' : ''}`}
        style={indent ? { paddingLeft: 24 } : undefined}
        onClick={() => onSelect(feed.id)}
        onContextMenu={e => onContextMenu?.(e, feed.id)}
        title={feed.title + (feed.disabled ? ` (${t.articleList.paused.toLowerCase()})` : '')}
      >
      {/* Favicon BEFORE title, with colored letter fallback */}
      <div style={{ opacity: feed.disabled ? 0.5 : 1 }}>
        <FeedFavicon icon={feed.icon} title={feed.title} size={15} />
      </div>
      <span className="item-label" style={{ 
        fontStyle: feed.disabled ? 'italic' : 'normal',
        opacity: feed.disabled ? 0.6 : 1
      }}>{feed.title}</span>
      {unread > 0 && (
        <div className="cyber-badge" style={{ fontSize: 9, padding: '1px 4px', opacity: feed.disabled ? 0.5 : 1 }}>
          {unread}
        </div>
      )}
    </div>
  )
})

export default Sidebar
