import React, { memo } from 'react'
import { Rss, Inbox, Bell, Settings, RefreshCw, Minus, Maximize2, X, LayoutTemplate, Info } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useFeedsStore } from '../store/feeds.store'
import { useSettingsStore } from '../store/settings.store'

const TopBar = memo(function TopBar(): JSX.Element {
  const { openPanel, setLayout, layout, isFetching } = useUIStore()
  const { fetchAll } = useFeedsStore()
  const { settings } = useSettingsStore()

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

      <button className="btn btn-ghost btn-icon no-drag" onClick={() => openPanel('inbox')} title="Inbox Today">
        <Inbox size={15} />
      </button>
      <button className="btn btn-ghost btn-icon no-drag" onClick={() => openPanel('history')} title="Notification History">
        <Bell size={15} />
      </button>
      <button className="btn btn-ghost btn-icon no-drag" onClick={cycleLayout} title="Toggle Layout">
        <LayoutTemplate size={15} />
      </button>
      <button className="btn btn-ghost btn-icon no-drag" onClick={handleFetchAll} title="Refresh All" disabled={isFetching}>
        <RefreshCw size={15} className={isFetching ? 'spin-icon' : ''} style={isFetching ? { animation: 'spin 0.7s linear infinite' } : {}} />
      </button>
      <button className="btn btn-ghost btn-icon no-drag" onClick={() => openPanel('settings')} title="Settings">
        <Settings size={15} />
      </button>
      <button className="btn btn-ghost btn-icon no-drag" onClick={() => openPanel('about')} title="About CyberFeeds">
        <Info size={15} />
      </button>

      <div className="divider" style={{ width: 1, height: 18, margin: '0 4px' }} />

      <div className="win-controls">
        <button className="win-btn" onClick={() => window.api.windowMinimize()} title="Minimize"><Minus size={13} /></button>
        <button className="win-btn" onClick={() => window.api.windowMaximize()} title="Maximize"><Maximize2 size={12} /></button>
        <button className="win-btn close" onClick={() => window.api.windowClose()} title="Close"><X size={13} /></button>
      </div>
    </div>
  )
})

export default TopBar
