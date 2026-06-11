import { memo } from 'react'
import { Rss, Inbox, Bell, Settings, RefreshCw, Minus, Maximize2, X, LayoutTemplate, Info } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useFeedsStore } from '../store/feeds.store'
import { useTranslation } from '../hooks/useTranslation'

const TopBar = memo(function TopBar(): JSX.Element {
  const { openPanel, setLayout, layout, isFetching, unseenNotificationsCount } = useUIStore()
  const { fetchAll } = useFeedsStore()
  const { t } = useTranslation()

  const handleFetchAll = async (): Promise<void> => {
    useUIStore.setState({ isFetching: true })
    await fetchAll()
    setTimeout(() => useUIStore.setState({ isFetching: false }), 1000)
  }

  const cycleLayout = (): void => {
    const layouts: Array<'three-panel' | 'two-panel' | 'one-panel'> = ['three-panel', 'two-panel', 'one-panel']
    const next = layouts[(layouts.indexOf(layout) + 1) % layouts.length]
    setLayout(next)
  }

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <Rss size={16} />
        <span>CyberFeeds</span>
      </div>
      <div className="topbar-drag" />

      <button
        className="btn btn-ghost btn-icon no-drag"
        onClick={() => {
          openPanel('history')
        }}
        title={t.topBar.notificationHistory}
        style={{ position: 'relative' }}
      >
        <Bell size={15} />
        {unseenNotificationsCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            background: 'var(--red, #ff5555)',
            color: '#ffffff',
            borderRadius: '50%',
            width: 14,
            height: 14,
            fontSize: 9,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--bg-0)',
            boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}>
            {unseenNotificationsCount}
          </span>
        )}
      </button>
      <button className="btn btn-ghost btn-icon no-drag" onClick={() => openPanel('inbox')} title={t.topBar.inboxToday}>
        <Inbox size={15} />
      </button>
      <button className="btn btn-ghost btn-icon no-drag" onClick={cycleLayout} title={t.topBar.toggleLayout}>
        <LayoutTemplate size={15} />
      </button>
      <button className="btn btn-ghost btn-icon no-drag" onClick={handleFetchAll} title={t.topBar.refreshAll} disabled={isFetching}>
        <RefreshCw size={15} className={isFetching ? 'spin-icon' : ''} style={isFetching ? { animation: 'spin 0.7s linear infinite' } : {}} />
      </button>
      <button className="btn btn-ghost btn-icon no-drag" onClick={() => openPanel('settings')} title={t.topBar.settings}>
        <Settings size={15} />
      </button>
      <button className="btn btn-ghost btn-icon no-drag" onClick={() => openPanel('about')} title={t.topBar.about}>
        <Info size={15} />
      </button>

      <div className="divider" style={{ width: 1, height: 18, margin: '0 4px' }} />

      <div className="win-controls">
        <button className="win-btn" onClick={() => window.api.windowMinimize()} title={t.topBar.minimize}><Minus size={13} /></button>
        <button className="win-btn" onClick={() => window.api.windowMaximize()} title={t.topBar.maximize}><Maximize2 size={12} /></button>
        <button className="win-btn close" onClick={() => window.api.windowClose()} title={t.topBar.close}><X size={13} /></button>
      </div>
    </div>
  )
})

export default TopBar
