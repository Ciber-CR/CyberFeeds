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

function normalizeKey(key: string, code: string): string {
  if (key.length === 1 && key >= 'a' && key <= 'z') return key.toUpperCase()
  if (key.length === 1 && key >= 'A' && key <= 'Z') return key
  if (key.length === 1 && key >= '0' && key <= '9') return key

  switch (key) {
    case ' ': return 'Space'
    case 'ArrowUp': return 'Up'
    case 'ArrowDown': return 'Down'
    case 'ArrowLeft': return 'Left'
    case 'ArrowRight': return 'Right'
    case 'Escape': return 'Esc'
    case 'Enter': return 'Enter'
    case 'Tab': return 'Tab'
    case 'Backspace': return 'Backspace'
    case 'Delete': return 'Delete'
    case 'Insert': return 'Insert'
    case 'Home': return 'Home'
    case 'End': return 'End'
    case 'PageUp': return 'PageUp'
    case 'PageDown': return 'PageDown'
    case 'PrintScreen': return 'PrintScreen'
    case '`': case '~': return '`'
    case '-': case '_': return '-'
    case '=': case '+': return '='
    case '[': case '{': return '['
    case ']': case '}': return ']'
    case ';': case ':': return ';'
    case "'": case '"': return "'"
    case ',': case '<': return ','
    case '.': case '>': return '.'
    case '/': case '?': return '/'
    case '\\': case '|': return '\\'
  }

  if (/^F[1-9][0-9]?$/.test(key)) return key
  if (code.startsWith('Key')) return code.substring(3)
  if (code.startsWith('Digit')) return code.substring(5)
  if (code.startsWith('Numpad')) return code

  return key
}

function findShortcutConflict(
  currentKey: string,
  accelerator: string,
  shortcuts: any
): string | null {
  if (!accelerator) return null
  const cleanAcc = accelerator.trim().toLowerCase()
  for (const [key, val] of Object.entries(shortcuts)) {
    const s = val as any
    if (key !== currentKey && s.enabled && s.accelerator.trim().toLowerCase() === cleanAcc) {
      return key
    }
  }
  return null
}

interface HotkeyRecorderProps {
  actionKey: string
  value: string
  onChange: (newValue: string) => void
  shortcuts: any
  t: any
}

function HotkeyRecorder({ actionKey, value, onChange, shortcuts, t }: HotkeyRecorderProps): JSX.Element {
  const [recording, setRecording] = useState(false)
  const [tempValue, setTempValue] = useState('')

  const { language } = useTranslation()
  const isEs = language === 'es'

  const formatDisplay = (val: string) => {
    if (!val) return isEs ? 'Ninguno (Clic para agregar)' : 'None (Click to add)'
    return val
      .replace(/CommandOrControl/g, 'Ctrl')
      .replace(/CmdOrCtrl/g, 'Ctrl')
      .replace(/Control/g, 'Ctrl')
      .replace(/Meta/g, 'Win')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const key = e.key
    if (key === 'Escape') {
      setRecording(false)
      e.currentTarget.blur()
      return
    }

    if ((key === 'Backspace' || key === 'Delete') && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
      onChange('')
      setRecording(false)
      e.currentTarget.blur()
      return
    }

    const isModifier = ['Control', 'Shift', 'Alt', 'Meta'].includes(key)
    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey) parts.push('Alt')
    if (e.metaKey) parts.push('Cmd')

    if (!isModifier) {
      const normalized = normalizeKey(key, e.code)
      if (normalized) {
        parts.push(normalized)
      }
      const finalVal = parts.join('+')
      onChange(finalVal)
      setRecording(false)
      e.currentTarget.blur()
    } else {
      setTempValue(parts.join('+') + ' + ...')
    }
  }

  const handleFocus = () => {
    setRecording(true)
    setTempValue(isEs ? 'Presiona teclas...' : 'Press keys...')
  }

  const handleBlur = () => {
    setRecording(false)
    setTempValue('')
  }

  const conflictKey = findShortcutConflict(actionKey, value, shortcuts)
  const hasConflict = !!conflictKey

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <input
        type="text"
        className="form-input"
        readOnly
        value={recording ? tempValue : formatDisplay(value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={t.settings.keyboard.accelerator}
        style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          padding: '4px 6px',
          textAlign: 'center',
          cursor: 'pointer',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 4,
          background: recording 
            ? 'var(--accent-subtle)' 
            : hasConflict 
              ? 'rgba(210, 153, 34, 0.15)' 
              : 'var(--bg-1)',
          borderColor: recording 
            ? 'var(--accent)' 
            : hasConflict 
              ? 'var(--orange)' 
              : 'var(--border)',
          color: recording 
            ? 'var(--accent)' 
            : hasConflict 
              ? 'var(--orange)' 
              : value 
                ? 'var(--text-primary)' 
                : 'var(--text-muted)',
          fontWeight: recording || value ? '600' : '400',
          transition: 'all 0.15s ease',
          boxShadow: recording ? '0 0 8px var(--accent-subtle)' : 'none'
        }}
      />
      {hasConflict && (
        <span style={{ 
          fontSize: 9, 
          color: 'var(--orange)', 
          marginTop: 2, 
          textAlign: 'left',
          display: 'block' 
        }}>
          {t.settings.keyboard.validation.conflict}
        </span>
      )}
    </div>
  )
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

  type ActiveTab = 'general' | 'appearance' | 'notifications' | 'backupMaintenance'
  const [activeTab, setActiveTab] = useState<ActiveTab>('general')
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
    // Avoid closing bugs if user removed all shortcuts: still persist full settings.
    // Also persist shortcuts exactly as current UI state.
    await save(local)
    await window.api.updateShortcuts(local.shortcuts)
    closePanel()
  }

  // Ensure Save button always has a stable handler (regression guard)
  // eslint-disable-next-line react-hooks/exhaustive-deps


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
                onChange={e => {
                  const lang = e.target.value as 'en' | 'es'
                  update({ language: lang })
                  useSettingsStore.getState().update({ language: lang })
                }}>
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

            {/* ── Keyboard Shortcuts ────────────────────────────────────── */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-muted)' }}>
              <h3 style={{ fontSize: 13, marginBottom: 8 }}>{t.settings.keyboard.title}</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                {t.settings.keyboard.explanation}
              </p>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(local.shortcuts).map(([key, shortcut]) => (
                  <div key={key} style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr auto',
                    gap: 12,
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border-muted)',
                    borderRadius: 'var(--radius)'
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {t.settings.keyboard.actions[key as keyof typeof t.settings.keyboard.actions]}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <HotkeyRecorder
                        actionKey={key}
                        value={shortcut.accelerator}
                        onChange={newVal => {
                          const newShortcuts = { ...local.shortcuts }
                          newShortcuts[key as keyof typeof local.shortcuts] = {
                            ...shortcut,
                            accelerator: newVal,
                            enabled: newVal !== ''
                          }
                          update({ shortcuts: newShortcuts })
                        }}
                        shortcuts={local.shortcuts}
                        t={t}
                      />
                      <button
                        className="btn btn-ghost"
                        style={{
                          fontSize: 12,
                          width: 26,
                          height: 26,
                          padding: 0,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-2)',
                          cursor: 'pointer',
                          color: shortcut.accelerator ? 'var(--orange)' : 'var(--text-muted)',
                          opacity: shortcut.accelerator ? 1 : 0.7,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                        title={'Clear shortcut'}
                        onClick={() => {
                          const newShortcuts = { ...local.shortcuts }
                          newShortcuts[key as keyof typeof local.shortcuts] = { ...shortcut, accelerator: '', enabled: false }
                          update({ shortcuts: newShortcuts })
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <label className="toggle" style={{ margin: 0 }}>
                      <div
                        className={`toggle-track ${shortcut.global ? 'on' : ''}`}
                        onClick={() => {
                          const newShortcuts = { ...local.shortcuts }
                          newShortcuts[key as keyof typeof local.shortcuts] = { ...shortcut, global: !shortcut.global }
                          update({ shortcuts: newShortcuts })
                        }}
                      >
                        <div className="toggle-thumb" />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'inline-block', width: 42, textAlign: 'left' }}>
                        {shortcut.global ? 'Global' : 'App'}
                      </span>
                    </label>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-secondary"
                style={{ fontSize: 11, marginTop: 12 }}
                onClick={async () => {
                  const result = await window.api.resetShortcuts() as any
                  if (result?.shortcuts) {
                    setLocal(prev => ({ ...prev, shortcuts: result.shortcuts }))
                  }
                }}
              >
                {t.settings.keyboard.resetToDefaults}
              </button>
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
                  try { localStorage.setItem('cyberfeeds-theme', newTheme) } catch { /* ignore */ }
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

            <div className="form-group">
              <label className="form-label">{t.settings.notifications.snoozeDuration}</label>
              <select
                className="form-select"
                value={local.notifications.snoozeMinutes ?? 30}
                onChange={e => updateNotif({ snoozeMinutes: Number(e.target.value) })}
              >
                <option value={15}>15m</option>
                <option value={30}>30m</option>
                <option value={60}>1h</option>
                <option value={120}>2h</option>
                <option value={240}>4h</option>
                <option value={480}>8h</option>
                <option value={1440}>24h</option>
              </select>
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
