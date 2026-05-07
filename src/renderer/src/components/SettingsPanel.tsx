import React, { useState, useEffect } from 'react'
import { X, Settings, Monitor } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useSettingsStore } from '../store/settings.store'
import type { AppSettings } from '../types'

interface DisplayInfo {
  id: number
  label: string
  bounds: { width: number; height: number }
  isPrimary?: boolean
}

export default function SettingsPanel(): JSX.Element {
  const { closePanel } = useUIStore()
  const { settings, save } = useSettingsStore()
  const [local, setLocal] = useState<AppSettings>({ ...settings })
  const [importing, setImporting] = useState(false)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])

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
    if (result.ok) alert('Backup exported successfully!')
  }

  const handleImportBackup = async (): Promise<void> => {
    if (!confirm('This will OVERWRITE all your current feeds and settings. Continue?')) return
    setImporting(true)
    const result = await window.api.importBackup()
    setImporting(false)
    if (result.ok) {
      alert('Backup imported successfully! The app will reload to apply changes.')
      window.location.reload()
    } else if (result.error) {
      alert(`Import failed: ${result.error}`)
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
        <h2>Settings</h2>
        <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={15} /></button>
      </div>
      <div className="panel-body">

        {/* ── General ──────────────────────────────────────────── */}
        <div className="panel-section">
          <h3>General</h3>
          <div className="form-group">
            <label className="form-label">Polling Interval (minutes)</label>
            <input className="form-input" type="number" min={1} max={1440}
              value={local.pollingInterval}
              onChange={e => update({ pollingInterval: Number(e.target.value) })} />
          </div>
          <div className="form-group">
            <label className="form-label">Theme</label>
            <select className="form-select" value={local.theme}
              onChange={e => {
                const newTheme = e.target.value as AppSettings['theme']
                update({ theme: newTheme })
                document.documentElement.setAttribute('data-theme', newTheme)
              }}>
              <option value="dark">Dark (Default)</option>
              <option value="light">Light</option>
              <option value="dracula">Dracula</option>
              <option value="nord">Nord</option>
              <option value="hacker">Hacker</option>
              <option value="monokai">Monokai</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Layout</label>
            <select className="form-select" value={local.layout}
              onChange={e => update({ layout: e.target.value as AppSettings['layout'] })}>
              <option value="three-panel">Three Panel</option>
              <option value="two-panel">Two Panel</option>
              <option value="one-panel">One Panel</option>
            </select>
          </div>
          <label className="toggle">
            <div className={`toggle-track ${local.autoStart ? 'on' : ''}`}
              onClick={() => update({ autoStart: !local.autoStart })}>
              <div className="toggle-thumb" />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Start with Windows</span>
          </label>
        </div>

        {/* ── Notifications ─────────────────────────────────────── */}
        <div className="panel-section">
          <h3>Notifications</h3>

          <label className="toggle" style={{ marginBottom: 14 }}>
            <div className={`toggle-track ${local.notifications.enabled ? 'on' : ''}`}
              onClick={() => updateNotif({ enabled: !local.notifications.enabled })}>
              <div className="toggle-thumb" />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Enable notifications</span>
          </label>

          {/* Monitor selector */}
          {displays.length > 1 && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Monitor size={12} />
                Display / Monitor
              </label>
              <select
                className="form-select"
                value={local.notifications.displayId}
                onChange={e => updateNotif({ displayId: Number(e.target.value) })}
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
              Single display detected ({displays[0]?.bounds.width}×{displays[0]?.bounds.height})
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Position</label>
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
                  {p.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Duration (ms)</label>
            <input className="form-input" type="number" min={1000} step={500}
              value={local.notifications.duration}
              onChange={e => updateNotif({ duration: Number(e.target.value) })} />
          </div>

          <div className="form-group">
            <label className="form-label">Max Stack</label>
            <input className="form-input" type="number" min={1} max={10}
              value={local.notifications.maxStack}
              onChange={e => updateNotif({ maxStack: Number(e.target.value) })} />
          </div>

          <div className="form-group">
            <label className="form-label">Alert Sound</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12 }}
                onClick={async () => {
                  const filePath = await window.api.pickSoundFile()
                  if (filePath) updateNotif({ soundFile: filePath })
                }}
              >
                Browse…
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {local.notifications.soundFile
                  ? local.notifications.soundFile.split(/[\\/]/).pop()
                  : 'System default (beep)'}
              </span>
              {local.notifications.soundFile && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '2px 6px' }}
                  onClick={() => updateNotif({ soundFile: null })}
                  title="Reset to system default"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <button
            className="btn btn-secondary"
            style={{ fontSize: 12 }}
            onClick={() => window.api.previewNotification(local.notifications)}
          >
            Preview Notification
          </button>
        </div>



        {/* ── Column Typography ─────────────────────────────────────────────── */}
        <div className="panel-section">
          <h3>Column Font Sizes</h3>
          <div className="form-group">
            <label className="form-label">Sidebar: {local.sidebarFontSize}px</label>
            <input
              type="range" min={10} max={16} step={1}
              value={local.sidebarFontSize ?? 13}
              onChange={e => {
                const v = Number(e.target.value)
                update({ sidebarFontSize: v })
                // Live preview without saving
                document.documentElement.style.setProperty('--sidebar-font-size', `${v}px`)
              }}
              style={{ width: '100%' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Article List: {local.listFontSize}px</label>
            <input
              type="range" min={10} max={16} step={1}
              value={local.listFontSize ?? 13}
              onChange={e => {
                const v = Number(e.target.value)
                update({ listFontSize: v })
                // Live preview without saving
                document.documentElement.style.setProperty('--list-font-size', `${v}px`)
              }}
              style={{ width: '100%' }}
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Column widths can be adjusted by dragging the dividers in the main layout.
          </p>
        </div>

        {/* ── Backup ──────────────────────────────────────────────── */}
        <div className="panel-section">
          <h3>Global Backup & Restore</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            Export or import your entire configuration (feeds, folders, and settings). 
            <strong>Note:</strong> Regular articles will be cleared, but your <strong>Favorites</strong> will be preserved.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleExportBackup}>
              Export Backup
            </button>
            <button className="btn btn-secondary" onClick={handleImportBackup} disabled={importing}>
              {importing ? <div className="spinner" style={{ width: 13, height: 13 }} /> : 'Import Backup'}
            </button>
          </div>
        </div>

        {/* ── Maintenance ──────────────────────────────────────── */}
        <div className="panel-section">
          <h3>Maintenance</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            Optimize your database by removing old data. <strong>Note:</strong> Articles marked with a star (Favorites) are never deleted.
          </p>
          <div className="form-group">
            <label className="form-label">Delete read articles older than (days)</label>
            <input className="form-input" type="number" min={1}
              value={local.cleanupReadDays}
              onChange={e => update({ cleanupReadDays: Number(e.target.value) })} />
          </div>
          <button className="btn btn-danger" style={{ fontSize: 12, marginTop: 4 }}
            onClick={() => window.api.cleanup(local.cleanupReadDays)}>
            Run Clean Up Now
          </button>
        </div>

      </div>
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-ghost" onClick={closePanel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  )
}
