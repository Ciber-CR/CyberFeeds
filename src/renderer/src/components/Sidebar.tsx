import React, { memo, useState, useCallback } from 'react'
import { FolderOpen, FolderPlus, ChevronRight, ChevronDown, ChevronUp, ChevronsUpDown, ChevronsDownUp, Plus, Upload, Download, Stethoscope } from 'lucide-react'
import { useFeedsStore } from '../store/feeds.store'
import { useUIStore } from '../store/ui.store'
import { FeedFavicon } from './ArticleList'
import type { Feed, Folder } from '../types'

const Sidebar = memo(function Sidebar(): JSX.Element {
  const { feeds, folders, unreadCounts, loadAll, deleteFeed, fetchFeed, fetchFolder, togglePauseFeed, togglePauseFolder, addFolder, deleteFolder } = useFeedsStore()
  const { selectedFeedId, selectFeed, openPanel } = useUIStore()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [ctx, setCtx] = React.useState<{ x: number, y: number, type: 'feed' | 'folder', id: string } | null>(null)

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
      setImportMsg(`✓ ${result.added} feeds added`)
      setTimeout(() => setImportMsg(''), 3000)
    } catch {
      setImportMsg('Import failed')
      setTimeout(() => setImportMsg(''), 3000)
    }
    setImporting(false)
  }, [loadAll])

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
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
            <span style={{
              width: 15, height: 15, borderRadius: 3, background: 'var(--accent)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#0d1117', flexShrink: 0
            }}>∞</span>
            <span className="item-label">All Feeds</span>
          </span>
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
            <span style={{
              width: 15, height: 15, borderRadius: 3, background: 'var(--star)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#0d1117', flexShrink: 0
            }}>★</span>
            <span className="item-label">Favorites</span>
          </span>
          {totalStarred > 0 && (
            <div className="cyber-badge" style={{ fontSize: 9, padding: '1px 4px' }}>
              {totalStarred}
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Folders */}
        {sortedFolders.map(folder => (
          <FolderSection
            key={folder.id}
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
            title={collapsed.size > 0 ? 'Expand All' : 'Collapse All'}
          >
            {collapsed.size > 0 ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
          </button>

          <button
            className="add-feed-btn"
            style={{ flex: 0, padding: '6px 8px' }}
            onClick={handleAddFolder}
            title="New Folder"
          >
            <FolderPlus size={13} />
          </button>

          <button className="add-feed-btn" style={{ flex: 1 }} onClick={() => openPanel('addFeed')}>
            <Plus size={13} />
            Add Feed
          </button>
          <button
            className="add-feed-btn"
            style={{ flex: 0, padding: '6px 8px' }}
            onClick={handleImportOpml}
            disabled={importing}
            title="Import OPML"
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
            title="Export OPML"
          >
            <Download size={13} />
          </button>
          <button
            className="add-feed-btn"
            style={{ flex: 0, padding: '6px 8px' }}
            onClick={() => openPanel('doctor')}
            title="Feeds Doctor"
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
            top: Math.min(ctx.y, window.innerHeight - (ctx.type === 'feed' ? 120 : 50)) 
          }} 
          onClick={e => e.stopPropagation()}
        >
          {ctx.type === 'feed' ? (
            <>
              <div className="ctx-item" onClick={() => {
                fetchFeed(ctx.id)
                setCtx(null)
              }}>
                Refresh Feed
              </div>
              <div className="ctx-item" onClick={() => {
                openPanel('editFeed', ctx.id)
                setCtx(null)
              }}>
                Edit Feed
              </div>
              <div className="ctx-item" onClick={() => {
                togglePauseFeed(ctx.id)
                setCtx(null)
              }}>
                {feeds.find(f => f.id === ctx.id)?.disabled ? 'Resume Feed' : 'Pause Feed'}
              </div>
              <div className="ctx-divider" />
              <div className="ctx-item danger" onClick={async () => {
                const feed = feeds.find(f => f.id === ctx.id)
                if (feed && confirm(`Are you sure you want to delete "${feed.title}"?`)) {
                  await deleteFeed(ctx.id)
                }
                setCtx(null)
              }}>
                Delete Feed
              </div>
            </>
          ) : (
            <>
              <div className="ctx-item" onClick={() => {
                fetchFolder(ctx.id)
                setCtx(null)
              }}>
                Refresh Folder
              </div>
              <div className="ctx-item" onClick={() => {
                togglePauseFolder(ctx.id)
                setCtx(null)
              }}>
                {feeds.filter(f => f.folderId === ctx.id)[0]?.disabled ? 'Resume Folder' : 'Pause Folder'}
              </div>
              <div className="ctx-divider" />
              <div className="ctx-item danger" onClick={async () => {
                const folder = folders.find(f => f.id === ctx.id)
                if (folder && confirm(`Are you sure you want to delete folder "${folder.name}"? Feeds inside will be unfiled.`)) {
                  await deleteFolder(ctx.id)
                }
                setCtx(null)
              }}>
                Delete Folder
              </div>
            </>
          )}
        </div>
      )}
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
        {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        <FolderOpen size={13} />
        <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {folder.name}
        </span>
        {folderUnread > 0 && (
          <div className="cyber-badge" style={{ fontSize: 9, padding: '1px 4px' }}>
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
  return (
    <div
      className={`sidebar-item ${selected ? 'active' : ''} ${feed.disabled ? 'paused' : ''}`}
      style={indent ? { paddingLeft: 24 } : undefined}
      onClick={() => onSelect(feed.id)}
      onContextMenu={e => onContextMenu?.(e, feed.id)}
      title={feed.title + (feed.disabled ? ' (Paused)' : '')}
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
