import React, { useEffect, useCallback, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useFeedsStore } from './store/feeds.store'
import { useArticlesStore } from './store/articles.store'
import { useUIStore } from './store/ui.store'
import { useSettingsStore } from './store/settings.store'
import { useColumnResize } from './hooks/useColumnResize'
import { useOverlayDismiss } from './hooks/useOverlayDismiss'
import { useTranslation } from './hooks/useTranslation'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import ArticleList from './components/ArticleList'
import ArticleViewer from './components/ArticleViewer'
import SettingsPanel from './components/SettingsPanel'
import AddFeedModal from './components/AddFeedModal'
import EditFeedModal from './components/EditFeedModal'
import AddFolderModal from './components/AddFolderModal'
import EditFolderModal from './components/EditFolderModal'
import InboxPanel from './components/InboxPanel'
import NotificationHistoryPanel from './components/NotificationHistoryPanel'
import AboutModal from './components/AboutModal'
import DoctorPanel from './components/DoctorPanel'
import Tooltip from './components/Tooltip'

type UpdateStatus =
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

export default function App(): JSX.Element {
  const { loadAll, refreshUnreadCounts } = useFeedsStore()
  const { load, refresh } = useArticlesStore()
  const { selectedFeedId, selectedArticleId, activePanel, layout, unreadOnly, search, closePanel } =
    useUIStore()
  const { load: loadSettings, settings } = useSettingsStore()
  const { t, language } = useTranslation()
  const dismissInbox = useOverlayDismiss(closePanel)
  const dismissHistory = useOverlayDismiss(closePanel)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)

  // ── Resize hooks — MUST be at top level, before any conditionals ──────────
  const [sidebarDragging, setSidebarDragging] = useState(false)
  const [listDragging, setListDragging] = useState(false)
  const { startDrag: startSidebarDrag } = useColumnResize('sidebar', 220, 140, 480)
  const { startDrag: startListDrag } = useColumnResize('articleList', 320, 180, 620)

  // Bootstrap
  useEffect(() => {
    loadSettings()
    loadAll()
    load({ limit: 60, offset: 0 })

    // Load unseen notifications count
    const lastChecked = Number(localStorage.getItem('lastCheckedNotificationsTime') || 0)
    // Seed main-process DB so the notifier badge computes the same unseen count.
    window.api.markNotificationsChecked(lastChecked)
    window.api.getNotificationHistory().then((history) => {
      const unseen = history.filter((h) => h.createdAt > lastChecked).length
      useUIStore.setState({ unseenNotificationsCount: unseen })
    })
  }, [])

  // Apply layout + font sizes from saved settings as CSS vars
  useEffect(() => {
    if (settings.layout) useUIStore.setState({ layout: settings.layout })
    if (settings.unreadOnly) useUIStore.setState({ unreadOnly: settings.unreadOnly })
    if (settings.sidebarFontSize) {
      document.documentElement.style.setProperty(
        '--sidebar-font-size',
        `${settings.sidebarFontSize}px`
      )
    }
    if (settings.listFontSize) {
      document.documentElement.style.setProperty('--list-font-size', `${settings.listFontSize}px`)
    }
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark')
    try {
      localStorage.setItem('cyberfeeds-theme', settings.theme || 'dark')
    } catch {
      /* ignore */
    }
  }, [
    settings.layout,
    settings.unreadOnly,
    settings.sidebarFontSize,
    settings.listFontSize,
    settings.theme
  ])

  // React to feed/filter changes
  useEffect(() => {
    const query: Record<string, unknown> = { limit: 60, offset: 0 }
    if (selectedFeedId === 'starred') {
      query.starredOnly = true
    } else if (selectedFeedId) {
      query.feedId = selectedFeedId
    }
    if (unreadOnly) query.unreadOnly = true
    if (search) query.search = search
    load(query)
  }, [selectedFeedId, unreadOnly, search])

  // Listen for new articles from main process
  useEffect(() => {
    const unsub = window.api.onArticlesUpdated(() => {
      refresh()
      refreshUnreadCounts()
    })
    return unsub
  }, [])

  // Listen for open article requests (e.g. from notifier click)
  useEffect(() => {
    const unsub = window.api.onOpenArticle((feedId, articleId) => {
      useUIStore.setState({
        selectedFeedId: feedId,
        selectedArticleId: articleId || null,
        activePanel: null
      })
    })
    return unsub
  }, [])

  // Listen for open settings requests (e.g. from tray menu)
  useEffect(() => {
    const unsub = window.api.onOpenSettings(() => {
      useUIStore.setState({ activePanel: 'settings' })
    })
    return unsub
  }, [])

  // Listen for real-time notifications to update unseen badge count
  useEffect(() => {
    const unsub = window.api.onNewNotification(() => {
      const state = useUIStore.getState()
      if (state.activePanel !== 'history') {
        useUIStore.setState({ unseenNotificationsCount: state.unseenNotificationsCount + 1 })
      }
    })
    return unsub
  }, [])

  // Listen for background auto-update status to show visual toast
  useEffect(() => {
    const off = window.api.onUpdateStatus((s) => {
      const status = s as UpdateStatus
      if (status.state === 'available' || status.state === 'downloaded') {
        setUpdateStatus(status)
      }
    })
    return off
  }, [])

  // Listen for opening notification history from the notifier sub-app
  useEffect(() => {
    const unsub = window.api.onOpenHistory(() => {
      useUIStore.setState({ activePanel: 'history' })
    })
    return unsub
  }, [])

  // Listen for polling toggled requests from tray context menu
  useEffect(() => {
    const unsub = window.api.onPollingToggled((pollingEnabled) => {
      useSettingsStore.getState().update({ pollingEnabled })
    })
    return unsub
  }, [])

  // Native text context menu for editable fields (modals, settings, search, etc.)
  useEffect(() => {
    const isEditableTextField = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false
      const el = target.closest('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null
      if (!el || el.disabled || el.readOnly) return false
      if (el instanceof HTMLTextAreaElement) return true
      const type = (el.type || 'text').toLowerCase()
      return ['text', 'search', 'url', 'email', 'password', 'tel', 'number'].includes(type)
    }

    const onContextMenu = (e: MouseEvent): void => {
      if (!isEditableTextField(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      window.api.showInputContextMenu()
    }

    document.addEventListener('contextmenu', onContextMenu, true)
    return () => document.removeEventListener('contextmenu', onContextMenu, true)
  }, [])

  // Keyboard shortcuts
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePanel) closePanel()
    },
    [activePanel]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Drag handlers (track active state for .active class on handle)
  const handleSidebarDrag = useCallback(
    (e: React.MouseEvent) => {
      setSidebarDragging(true)
      startSidebarDrag(e)
      const onUp = (): void => {
        setSidebarDragging(false)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mouseup', onUp)
    },
    [startSidebarDrag]
  )

  const handleListDrag = useCallback(
    (e: React.MouseEvent) => {
      setListDragging(true)
      startListDrag(e)
      const onUp = (): void => {
        setListDragging(false)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mouseup', onUp)
    },
    [startListDrag]
  )

  const showArticleList = layout !== 'one-panel'
  const showSidebar = layout === 'three-panel'

  return (
    <div id="root">
      <TopBar />
      <div className="app-layout">
        {showSidebar && <Sidebar />}
        {showSidebar && (
          <Tooltip label={t.common.resizeSidebar} placement="right">
            <div
              className={`resize-handle${sidebarDragging ? ' active' : ''}`}
              onMouseDown={handleSidebarDrag}
            />
          </Tooltip>
        )}
        <div className="main-area">
          {showArticleList && <ArticleList />}
          {showArticleList && (
            <Tooltip label={t.common.resizeArticleList} placement="right">
              <div
                className={`resize-handle${listDragging ? ' active' : ''}`}
                onMouseDown={handleListDrag}
              />
            </Tooltip>
          )}
          <ArticleViewer key={selectedArticleId} />
        </div>
      </div>

      {/* Panels */}
      {activePanel === 'settings' && (
        <div className="panel-overlay">
          <SettingsPanel />
        </div>
      )}
      {activePanel === 'inbox' && (
        <div className="panel-overlay" {...dismissInbox}>
          <InboxPanel />
        </div>
      )}
      {activePanel === 'history' && (
        <div className="panel-overlay" {...dismissHistory}>
          <NotificationHistoryPanel />
        </div>
      )}
      {activePanel === 'addFeed' && <AddFeedModal />}
      {activePanel === 'editFeed' && <EditFeedModal />}
      {activePanel === 'addFolder' && <AddFolderModal />}
      {activePanel === 'editFolder' && <EditFolderModal />}
      {activePanel === 'about' && <AboutModal />}
      {activePanel === 'doctor' && <DoctorPanel />}

      {/* Toast Notification for Updates */}
      {updateStatus && (
        <div
          className="cyber-toast"
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9999,
            background: 'linear-gradient(135deg, var(--bg-1), var(--bg-0))',
            border: '1px solid var(--accent)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 12px var(--accent-subtle)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            maxWidth: 360,
            animation: 'slideUp 0.3s ease'
          }}
        >
          <Bell size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-primary)' }}>
            {updateStatus.state === 'available' ? (
              <div>
                <strong style={{ fontWeight: 600 }}>{t.about.statuses.available}</strong>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Version {updateStatus.version}
                </div>
              </div>
            ) : (
              <div>
                <strong style={{ fontWeight: 600 }}>{t.about.statuses.downloaded}</strong>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-accent)',
                    marginTop: 2,
                    fontWeight: 500
                  }}
                >
                  {language === 'es'
                    ? 'Haz clic para reiniciar e instalar'
                    : 'Click to restart and install'}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            {updateStatus.state === 'available' ? (
              <button
                className="btn btn-primary"
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={async () => {
                  await window.api.downloadUpdate()
                }}
              >
                {t.about.downloadBtn}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={() => {
                  window.api.installUpdate()
                }}
              >
                {language === 'es' ? 'Reiniciar' : 'Restart'}
              </button>
            )}
            <button
              className="btn btn-ghost btn-icon"
              style={{ width: 22, height: 22 }}
              onClick={() => setUpdateStatus(null)}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
