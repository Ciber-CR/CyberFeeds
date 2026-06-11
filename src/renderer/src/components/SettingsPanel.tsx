import { useState, useEffect } from 'react'
import { X, Settings, Monitor, Bell, Zap, Sliders, Palette, Database, Stethoscope } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useSettingsStore } from '../store/settings.store'
import { useConfirm } from '../hooks/useConfirm'
import { useAlert } from '../hooks/useAlert'
import ConfirmDialog from './ConfirmDialog'
import AlertDialog from './AlertDialog'
import type { AppSettings } from '../types'
import { useTranslation } from '../hooks/useTranslation'

interface DisplayInfo {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  isPrimary?: boolean
}

export default function SettingsPanel(): JSX.Element {
  const { closePanel, openPanel } = useUIStore()
  const { settings, save } = useSettingsStore()
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm()
  const { alert, alertState, handleClose } = useAlert()
  const [local, setLocal] = useState<AppSettings>({ ...settings })
  const [importing, setImporting] = useState(false)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [testing, setTesting] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'keyboard' | 'backupMaintenance'>('general')
  const { t } = useTranslation()

  // Load available displays
  useEffect(() => {
    window.api.getDisplays().then((raw: any[]) => {
      setDisplays(raw.map(d => ({
        id: d.id,
        label: d.label,
        bounds: d.bounds,
        isPrimary: d.isPrimary
      })))
    })
  }, [])

  const update = (partial: Partial<AppSettings>): void =>
    setLocal(prev => ({ ...prev, ...partial }))

  const updateNotif = (partial: Partial<AppSettings['notifications']>): void =>
    setLocal(prev => ({ ...prev, notifications: { ...prev.notifications, ...partial } }))

  const handleSave = async (): Promise<void> => {
    await save(local)
    closePanel()
  }

  const handleExportBackup = async (): Promise<void> => {
    const result = await window.api.exportBackup()
    if (result.ok) {
      await alert({
        title: t.settings.backup.dialogs.exportSuccessTitle,
        message: t.settings.backup.dialogs.exportSuccessMsg,
        variant: 'success'
      })
    }
  }

  const handleImportBackup = async (): Promise<void> => {
    const confirmed = await confirm({
      title: t.settings.backup.dialogs.importTitle,
      message: t.settings.backup.dialogs.importMsg,
      confirmText: t.settings.backup.dialogs.importBtn,
      cancelText: t.sidebar.cancel,
      variant: 'warning'
    })
    if (!confirmed) return
    setImporting(true)
    const result = await window.api.importBackup()
    setImporting(false)
    if (result.ok) {
      await alert({
        title: t.settings.backup.dialogs.importSuccessTitle,
        message: t.settings.backup.dialogs.importSuccessMsg,
        variant: 'success'
      })
      window.location.reload()
    } else if (result.error) {
      await alert({
        title: t.settings.backup.dialogs.importFailTitle,
        message: t.settings.backup.dialogs.importFailMsg.replace('{error}', result.error),
        variant: 'error'
      })
    }
  }

  const positions = [
    'top-left', 'top-center', 'top-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ]

  return (
    <div className="panel" style={{ width: 520 }}>
      <div className="panel-header">
        <Settings size={16} style={{ color: 'var(--accent)' }} />
        <h2>{t.settings.title}</h2>
        <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={15} /></button>
      </div>

      <div className="settings-tabs">
        <button className={`settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
          <Sliders size={13} />
          {t.settings.tabs.general}
        </button>
        <button className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>
          <Palette size={13} />
          {t.settings.tabs.appearance}
        </button>
        <button className={`settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
          <Bell size={13} />
          {t.settings.tabs.notifications}
        </button>
        <button className={`settings-tab-btn ${activeTab === 'keyboard' ? 'active' : ''}`} onClick={() => setActiveTab('keyboard')}>
          <Monitor size={13} />
          {t.settings.tabs.keyboard}
        </button>
        <button className={`settings-tab-btn ${activeTab === 'backupMaintenance' ? 'active' : ''}`} onClick={() => setActiveTab('backupMaintenance')}>
          <Database size={13} />
          {t.settings.tabs.backupMaintenance}
        </button>
      </div>

      <div className="panel-body">

        {/* ── General ──────────────────────────────────────────── */}
        {activeTab === 'general' && (
          <div className="panel-section">
            <div className="form-group">
              <label className="form-label">{t.settings.general.language}</label>
              <select className="form-select" value={local.language || 'en'}
                onChange={e => update({ language: e.target.value as 'en' | 'es' })}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t.settings.general.pollingInterval}</label>
              <input className="form-input" type="number" min={1} max={1440}
                value={local.pollingInterval}
                onChange={e => update({ pollingInterval: Number(e.target.value) })} />
            </div>

            {/* Browser selection */}
            <div className="form-group" style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-muted)' }}>
              <label className="form-label">{t.settings.general.linksOpenIn}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="form-select"
                  value={local.customBrowserPath ? 'custom' : 'default'}
                  onChange={async e => {
                    if (e.target.value === 'default') {
                      update({ customBrowserPath: '' })
                    } else if (e.target.value === 'custom') {
                      const path = await window.api.pickBrowser()
                      if (path) {
                        update({ customBrowserPath: path })
                      } else {
                        // Revert select
                        setTimeout(() => {
                          const sel = document.querySelector('select[value="custom"]') as HTMLSelectElement | null
                          if (sel) sel.value = 'default'
                        }, 0)
                      }
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  <option value="default">{t.settings.general.openOptions.default}</option>
                  <option value="custom">{t.settings.general.openOptions.custom}</option>
                </select>
                <button
                  className="btn btn-ghost"
                  onClick={async () => {
                    const path = await window.api.pickBrowser()
                    if (path) {
                      update({ customBrowserPath: path })
                    }
                  }}
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    color: 'var(--accent)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-2)',
                    cursor: 'pointer'
                  }}
                  title={t.settings.general.pickTooltip}
                >
                  {t.settings.general.pickBtn}
                </button>
              </div>
              {local.customBrowserPath && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {local.customBrowserPath}
                </div>
              )}
            </div>

            {/* System / Integration */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-muted)' }}>
              <label className="toggle">
                <div className={`toggle-track ${local.autoStart ? 'on' : ''}`}
                  onClick={() => update({ autoStart: !local.autoStart })}>
                  <div className="toggle-thumb" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.general.startWithWindows}</span>
              </label>
              <label className={`toggle ${!local.autoStart ? 'disabled' : ''}`}>
                <div className={`toggle-track ${local.startMinimized && local.autoStart ? 'on' : ''}`}
                  onClick={() => { if (local.autoStart) update({ startMinimized: !local.startMinimized }) }}>
                  <div className="toggle-thumb" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {t.settings.general.startMinimized}
                  {!local.autoStart && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                      {t.settings.general.requiresStartWithWindows}
                    </span>
                  )}
                </span>
              </label>
              <label className="toggle">
                <div className={`toggle-track ${local.minimizeToTray ? 'on' : ''}`}
                  onClick={() => update({ minimizeToTray: !local.minimizeToTray })}>
                  <div className="toggle-thumb" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.general.minimizeToTray}</span>
              </label>
            </div>
          </div>
        )}

        {/* ── Appearance ────────────────────────────────────────── */}
        {activeTab === 'appearance' && (
          <div className="panel-section">
            <div className="form-group">
              <label className="form-label">{t.settings.general.theme}</label>
              <select className="form-select" value={local.theme}
                onChange={e => {
                  const newTheme = e.target.value as AppSettings['theme']
                  update({ theme: newTheme })
                  document.documentElement.setAttribute('data-theme', newTheme)
                }}>
                <option value="dark">{t.settings.general.themes.dark}</option>
                <option value="light">{t.settings.general.themes.light}</option>
                <option value="dracula">{t.settings.general.themes.dracula}</option>
                <option value="nord">{t.settings.general.themes.nord}</option>
                <option value="hacker">{t.settings.general.themes.hacker}</option>
                <option value="monokai">{t.settings.general.themes.monokai}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t.settings.general.layout}</label>
              <select className="form-select" value={local.layout}
                onChange={e => update({ layout: e.target.value as AppSettings['layout'] })}>
                <option value="three-panel">{t.settings.general.layouts.threePanel}</option>
                <option value="two-panel">{t.settings.general.layouts.twoPanel}</option>
                <option value="one-panel">{t.settings.general.layouts.onePanel}</option>
              </select>
            </div>

            <label className="toggle" style={{ marginBottom: 16 }}>
              <div className={`toggle-track ${local.showArticleThumbnails ? 'on' : ''}`}
                onClick={() => update({ showArticleThumbnails: !local.showArticleThumbnails })}>
                <div className="toggle-thumb" />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.general.showThumbnails}</span>
            </label>

            {/* Typography */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-muted)' }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
                {t.settings.fontSizes.title}
              </h3>
              <div className="form-group">
                <label className="form-label">{t.settings.fontSizes.sidebar.replace('{size}', String(local.sidebarFontSize ?? 13))}</label>
                <input
                  type="range" min={10} max={16} step={1}
                  value={local.sidebarFontSize ?? 13}
                  onChange={e => {
                    const v = Number(e.target.value)
                    update({ sidebarFontSize: v })
                    document.documentElement.style.setProperty('--sidebar-font-size', `${v}px`)
                  }}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t.settings.fontSizes.articleList.replace('{size}', String(local.listFontSize ?? 13))}</label>
                <input
                  type="range" min={10} max={16} step={1}
                  value={local.listFontSize ?? 13}
                  onChange={e => {
                    const v = Number(e.target.value)
                    update({ listFontSize: v })
                    document.documentElement.style.setProperty('--list-font-size', `${v}px`)
                  }}
                  style={{ width: '100%' }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {t.settings.fontSizes.explanation}
              </p>
            </div>
          </div>
        )}

        {/* ── Notifications ─────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="panel-section">
            <label className="toggle" style={{ marginBottom: 14 }}>
              <div className={`toggle-track ${local.notifications.enabled ? 'on' : ''}`}
                onClick={() => updateNotif({ enabled: !local.notifications.enabled })}>
                <div className="toggle-thumb" />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.notifications.enable}</span>
            </label>

            <label className="toggle" style={{ marginBottom: 14 }}>
              <div className={`toggle-track ${local.notifications.showThumbnails ? 'on' : ''}`}
                onClick={() => updateNotif({ showThumbnails: !local.notifications.showThumbnails })}>
                <div className="toggle-thumb" />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.notifications.showThumbnails}</span>
            </label>

            {local.notifications.showThumbnails && (
              <label className="toggle" style={{ marginBottom: 14, marginLeft: 22 }}>
                <div className={`toggle-track ${local.notifications.preloadImages !== false ? 'on' : ''}`}
                  onClick={() => updateNotif({ preloadImages: local.notifications.preloadImages === false })}>
                  <div className="toggle-thumb" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.notifications.preloadImages}</span>
              </label>
            )}

            {/* Monitor selector */}
            {displays.length > 1 && (
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Monitor size={12} />
                  {t.settings.notifications.displayMonitor}
                </label>
                <select
                  className="form-select"
                  value={local.notifications.displayId}
                  onChange={e => {
                    const selectedId = Number(e.target.value)
                    const selectedDisplay = displays.find(d => d.id === selectedId)
                    updateNotif({
                      displayId: selectedId,
                      displayBounds: selectedDisplay?.bounds
                    })
                  }}
                >
                  {displays.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {displays.length === 1 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Monitor size={12} />
                {t.settings.notifications.singleDisplay
                  .replace('{width}', String(displays[0]?.bounds.width))
                  .replace('{height}', String(displays[0]?.bounds.height))}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t.settings.notifications.position}</label>
              {/* Visual 3×2 grid picker */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginTop: 4 }}>
                {positions.map(p => (
                  <button
                    key={p}
                    onClick={() => updateNotif({ position: p as AppSettings['notifications']['position'] })}
                    style={{
                      padding: '6px 4px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${local.notifications.position === p ? 'var(--accent)' : 'var(--border)'}`,
                      background: local.notifications.position === p ? 'var(--accent-subtle)' : 'var(--bg-2)',
                      color: local.notifications.position === p ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: 11,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit'
                    }}
                  >
                    {t.settings.notifications.positions[p as keyof typeof t.settings.notifications.positions]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t.settings.notifications.duration}</label>
              <input className="form-input" type="number" min={1000} step={500}
                value={local.notifications.duration}
                onChange={e => updateNotif({ duration: Number(e.target.value) })} />
            </div>

            <div className="form-group">
              <label className="form-label">{t.settings.notifications.maxStack}</label>
              <input className="form-input" type="number" min={1} max={10}
                value={local.notifications.maxStack}
                onChange={e => updateNotif({ maxStack: Number(e.target.value) })} />
            </div>

            <label className="toggle" style={{ marginBottom: 14 }}>
              <div className={`toggle-track ${local.notifications.soundEnabled ? 'on' : ''}`}
                onClick={() => updateNotif({ soundEnabled: !local.notifications.soundEnabled })}>
                <div className="toggle-thumb" />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.notifications.soundEnabled}</span>
            </label>

            <div className="form-group" style={{ opacity: local.notifications.soundEnabled ? 1 : 0.5, pointerEvents: local.notifications.soundEnabled ? 'auto' : 'none' }}>
              <label className="form-label">{t.settings.notifications.alertSound}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12 }}
                  disabled={!local.notifications.soundEnabled}
                  onClick={async () => {
                    const filePath = await window.api.pickSoundFile()
                    if (filePath) updateNotif({ soundFile: filePath })
                  }}
                >
                  {t.settings.notifications.browseBtn}
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {local.notifications.soundFile
                    ? local.notifications.soundFile.split(/[\\/]/).pop()
                    : t.settings.notifications.systemDefaultSound}
                </span>
                {local.notifications.soundFile && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 11, padding: '2px 6px' }}
                    disabled={!local.notifications.soundEnabled}
                    onClick={() => updateNotif({ soundFile: null })}
                    title={t.settings.notifications.resetToDefault}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <button
              className={`btn ${testing ? 'btn-accent' : 'btn-secondary'}`}
              style={{ 
                fontSize: 12, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                transition: 'all 0.2s',
                minWidth: 160,
                color: testing ? '#0d1117' : 'inherit',
                fontWeight: testing ? 700 : 400,
                pointerEvents: testing ? 'none' : 'auto',
                opacity: 1 // Override any inherited disabled opacity
              }}
              onClick={async () => {
                setTesting(true)
                await window.api.previewNotification(local.notifications)
                setTimeout(() => setTesting(false), 2000)
              }}
            >
              {testing ? <Zap size={14} style={{ animation: 'pulse 1s infinite' }} /> : <Bell size={14} />}
              {testing ? t.settings.notifications.sendingBtn : t.settings.notifications.previewBtn}
            </button>
          </div>
        )}

        {/* ── Keyboard Shortcuts ────────────────────────────────────── */}
        {activeTab === 'keyboard' && (
          <div className="panel-section">
            <h3>{t.settings.keyboard.title}</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
              {t.settings.keyboard.explanation}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(local.shortcuts).map(([key, shortcut]) => (
                <div key={key} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '140px 1fr 80px 80px 80px', 
                  gap: 8, 
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--bg-2)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {t.settings.keyboard.actions[key as keyof typeof t.settings.keyboard.actions]}
                  </span>
                  <input
                    className="form-input"
                    type="text"
                    value={shortcut.accelerator}
                    onChange={e => {
                      const newShortcuts = { ...local.shortcuts }
                      newShortcuts[key as keyof typeof local.shortcuts] = { ...shortcut, accelerator: e.target.value }
                      update({ shortcuts: newShortcuts })
                    }}
                    placeholder="Ctrl+Shift+A"
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  />
                  <label className="toggle" style={{ justifyContent: 'center' }}>
                    <div className={`toggle-track ${shortcut.enabled ? 'on' : ''}`}
                      onClick={() => {
                        const newShortcuts = { ...local.shortcuts }
                        newShortcuts[key as keyof typeof local.shortcuts] = { ...shortcut, enabled: !shortcut.enabled }
                        update({ shortcuts: newShortcuts })
                      }}>
                      <div className="toggle-thumb" />
                    </div>
                  </label>
                  <label className="toggle" style={{ justifyContent: 'center' }}>
                    <div className={`toggle-track ${shortcut.global ? 'on' : ''}`}
                      onClick={() => {
                        const newShortcuts = { ...local.shortcuts }
                        newShortcuts[key as keyof typeof local.shortcuts] = { ...shortcut, global: !shortcut.global }
                        update({ shortcuts: newShortcuts })
                      }}>
                      <div className="toggle-thumb" />
                    </div>
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                    {shortcut.global ? 'Global' : 'App'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12 }}
                onClick={async () => {
                  await window.api.resetShortcuts()
                  const settings = await window.api.getSettings()
                  setLocal(settings)
                }}
              >
                {t.settings.keyboard.resetToDefaults}
              </button>
              <button
                className="btn btn-accent"
                style={{ fontSize: 12 }}
                onClick={async () => {
                  await window.api.updateShortcuts(local.shortcuts)
                }}
              >
                {t.settings.keyboard.save}
              </button>
            </div>
          </div>
        )}

        {/* ── Backup & Maintenance ────────────────────────────────── */}
        {activeTab === 'backupMaintenance' && (
          <div>
            <div className="panel-section">
              <h3>{t.settings.backup.title}</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                {t.settings.backup.explanation}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={handleExportBackup}>
                  {t.settings.backup.exportBtn}
                </button>
                <button className="btn btn-secondary" onClick={handleImportBackup} disabled={importing}>
                  {importing ? <div className="spinner" style={{ width: 13, height: 13 }} /> : t.settings.backup.importBtn}
                </button>
              </div>
            </div>

            <div className="panel-section" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-muted)' }}>
              <h3>{t.settings.maintenance.title}</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                {t.settings.maintenance.explanation}
              </p>
              <div className="form-group">
                <label className="form-label">{t.settings.maintenance.deleteOlder}</label>
                <input className="form-input" type="number" min={1}
                  value={local.cleanupReadDays}
                  onChange={e => update({ cleanupReadDays: Number(e.target.value) })} />
              </div>
              <label className="toggle">
                <div className={`toggle-track ${local.autoCleanup ? 'on' : ''}`}
                  onClick={() => update({ autoCleanup: !local.autoCleanup })}>
                  <div className="toggle-thumb" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.maintenance.autoClean}</span>
              </label>
              <button className="btn btn-danger" style={{ fontSize: 12, marginTop: 4 }}
                onClick={() => window.api.cleanup(local.cleanupReadDays)}>
                {t.settings.maintenance.runCleanBtn}
              </button>
            </div>

            <div className="panel-section" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-muted)' }}>
              <h3>{t.sidebar.feedsDoctor}</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                {t.doctor.explanation}
              </p>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => openPanel('doctor')}
              >
                <Stethoscope size={14} />
                {t.sidebar.feedsDoctor}
              </button>
            </div>
          </div>
        )}

      </div>
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-ghost" onClick={closePanel}>{t.settings.cancel}</button>
        <button className="btn btn-primary" onClick={handleSave}>
          {t.settings.saveSettings}
        </button>
      </div>

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

      <AlertDialog
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        confirmText={alertState.confirmText}
        variant={alertState.variant}
        onClose={handleClose}
      />
    </div>
  )
}
