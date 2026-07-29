import { memo } from 'react'
import { Rss, Inbox, Bell, Settings, RefreshCw, Minus, Maximize2, X, LayoutTemplate, Info } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useFeedsStore } from '../store/feeds.store'
import { useTranslation } from '../hooks/useTranslation'
import Tooltip from './Tooltip'

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

      <Tooltip label={t.topBar.notificationHistory} placement="bottom">
        <button
          className="btn btn-ghost btn-icon no-drag"
          onClick={() => {
            openPanel('history')
          }}
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
      </Tooltip>
      <Tooltip label={t.topBar.inboxToday} placement="bottom">
        <button className="btn btn-ghost btn-icon no-drag" onClick={() => openPanel('inbox')}>
        <Inbox size={15} />
        </button>
      </Tooltip>
      <Tooltip label={t.topBar.toggleLayout} placement="bottom">
        <button className="btn btn-ghost btn-icon no-drag" onClick={cycleLayout}>
        <LayoutTemplate size={15} />
        </button>
      </Tooltip>
      <Tooltip label={t.topBar.refreshAll} placement="bottom">
        <button className="btn btn-ghost btn-icon no-drag" onClick={handleFetchAll} disabled={isFetching}>
        <RefreshCw size={15} className={isFetching ? 'spin-icon' : ''} style={isFetching ? { animation: 'spin 0.7s linear infinite' } : {}} />
        </button>
      </Tooltip>
      <Tooltip label={t.topBar.settings} placement="bottom">
        <button className="btn btn-ghost btn-icon no-drag" onClick={() => openPanel('settings')}>
        <Settings size={15} />
        </button>
      </Tooltip>
      <Tooltip label={t.topBar.about} placement="bottom">
        <button className="btn btn-ghost btn-icon no-drag" onClick={() => openPanel('about')}>
        <Info size={15} />
        </button>
      </Tooltip>

      <div className="divider" style={{ width: 1, height: 18, margin: '0 4px' }} />

      <div className="win-controls">
        <Tooltip label={t.topBar.minimize} placement="bottom">
          <button className="win-btn" onClick={() => window.api.windowMinimize()}><Minus size={13} /></button>
        </Tooltip>
        <Tooltip label={t.topBar.maximize} placement="bottom">
          <button className="win-btn" onClick={() => window.api.windowMaximize()}><Maximize2 size={12} /></button>
        </Tooltip>
        <Tooltip label={t.topBar.close} placement="bottom">
          <button className="win-btn close" onClick={() => window.api.windowClose()}><X size={13} /></button>
        </Tooltip>
      </div>
    </div>
  )
})

export default TopBar
