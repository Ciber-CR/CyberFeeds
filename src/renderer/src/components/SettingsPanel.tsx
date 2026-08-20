import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react'
import {
  Settings, Monitor, Bell, Zap, Sliders, Palette, Database,
  Stethoscope, Keyboard, X
} from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useSettingsStore } from '../store/settings.store'
import { useConfirm } from '../hooks/useConfirm'
import { useAlert } from '../hooks/useAlert'
import ConfirmDialog from './ConfirmDialog'
import AlertDialog from './AlertDialog'
import Tooltip from './Tooltip'
import type { AppSettings, KeyboardShortcuts } from '../types'
import { useTranslation } from '../hooks/useTranslation'

interface DisplayInfo {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  isPrimary?: boolean
}

type ActiveTab = 'general' | 'appearance' | 'notifications' | 'keyboard' | 'backupMaintenance'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

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
  shortcuts: KeyboardShortcuts
): string | null {
  if (!accelerator) return null
  const cleanAcc = accelerator.trim().toLowerCase()
  for (const [key, val] of Object.entries(shortcuts)) {
    const s = val as KeyboardShortcuts[keyof KeyboardShortcuts]
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
  shortcuts: KeyboardShortcuts
  t: ReturnType<typeof useTranslation>['t']
}

function HotkeyRecorder({ actionKey, value, onChange, shortcuts, t }: HotkeyRecorderProps): JSX.Element {
  const [recording, setRecording] = useState(false)
  const [tempValue, setTempValue] = useState('')

  const formatDisplay = (val: string): string => {
    if (!val) return t.settings.keyboard.empty
    return val
      .replace(/CommandOrControl/g, 'Ctrl')
      .replace(/CmdOrCtrl/g, 'Ctrl')
      .replace(/Control/g, 'Ctrl')
      .replace(/Meta/g, 'Win')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
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
      if (normalized) parts.push(normalized)
      onChange(parts.join('+'))
      setRecording(false)
      e.currentTarget.blur()
    } else {
      setTempValue(parts.join('+') + ' + …')
    }
  }

  const conflictKey = findShortcutConflict(actionKey, value, shortcuts)
  const hasConflict = !!conflictKey

  let inputClass = 'form-input hotkey-input'
  if (recording) inputClass += ' is-recording'
  else if (hasConflict) inputClass += ' has-conflict'
  else if (value) inputClass += ' has-value'
  else inputClass += ' is-empty'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Tooltip label={value ? formatDisplay(value) : t.settings.keyboard.emptyHint} placement="bottom">
        <input
          type="text"
          className={inputClass}
          readOnly
          value={recording ? tempValue : formatDisplay(value)}
          onFocus={() => {
            setRecording(true)
            setTempValue(t.settings.keyboard.recording)
          }}
          onBlur={() => {
            setRecording(false)
            setTempValue('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={t.settings.keyboard.accelerator}
        />
      </Tooltip>
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

interface SettingsPanelProps {
  onClose?: () => void
}

export default function SettingsPanel({ onClose }: SettingsPanelProps): JSX.Element {
  const { closePanel: storeClosePanel, openPanel } = useUIStore()
  const closePanel = onClose || storeClosePanel
  const { settings, save } = useSettingsStore()
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm()
  const { alert, alertState, handleClose } = useAlert()
  const [local, setLocal] = useState<AppSettings>({ ...settings })
  const [importing, setImporting] = useState(false)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [testing, setTesting] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('general')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const { t } = useTranslation()

  const localRef = useRef(local)
  const saveGen = useRef(0)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    localRef.current = local
  }, [local])

  useEffect(() => {
    window.api.getDisplays().then((raw: DisplayInfo[]) => {
      setDisplays(raw.map(d => ({
        id: d.id,
        label: d.label,
        bounds: d.bounds,
        isPrimary: d.isPrimary
      })))
    })
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    }
  }, [])

  const persist = useCallback((next: AppSettings, debounceMs = 0) => {
    setLocal(next)
    localRef.current = next

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    const run = async (): Promise<void> => {
      const toSave = localRef.current
      const gen = ++saveGen.current

      // Only show "Saving…" if the write actually takes a moment — fast IPC
      // saves would otherwise flash and look like a glitch before "Saved".
      const slowTimer = setTimeout(() => {
        if (gen === saveGen.current) setSaveStatus('saving')
      }, 450)

      try {
        await save(toSave)
        clearTimeout(slowTimer)
        if (gen !== saveGen.current) return
        setSaveStatus('saved')
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
        feedbackTimer.current = setTimeout(() => {
          if (gen === saveGen.current) setSaveStatus('idle')
        }, 2200)
      } catch {
        clearTimeout(slowTimer)
        if (gen !== saveGen.current) return
        setSaveStatus('error')
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
        feedbackTimer.current = setTimeout(() => {
          if (gen === saveGen.current) setSaveStatus('idle')
        }, 2500)
      }
    }

    if (debounceMs > 0) {
      // Keep current feedback stable while coalescing slider/number edits.
      debounceTimer.current = setTimeout(() => { void run() }, debounceMs)
    } else {
      void run()
    }
  }, [save])

  const update = (partial: Partial<AppSettings>, debounceMs = 0): void => {
    persist({ ...localRef.current, ...partial }, debounceMs)
  }

  const updateNotif = (partial: Partial<AppSettings['notifications']>, debounceMs = 0): void => {
    const cur = localRef.current
    persist({ ...cur, notifications: { ...cur.notifications, ...partial } }, debounceMs)
  }

  const updateShortcuts = (shortcuts: KeyboardShortcuts): void => {
    persist({ ...localRef.current, shortcuts })
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
  ] as const

  const navItems: Array<{ id: ActiveTab; label: string; icon: JSX.Element }> = [
    { id: 'general', label: t.settings.tabs.general, icon: <Sliders size={13} /> },
    { id: 'appearance', label: t.settings.tabs.appearance, icon: <Palette size={13} /> },
    { id: 'notifications', label: t.settings.tabs.notifications, icon: <Bell size={13} /> },
    { id: 'keyboard', label: t.settings.tabs.keyboard, icon: <Keyboard size={13} /> },
    { id: 'backupMaintenance', label: t.settings.tabs.backupMaintenance, icon: <Database size={13} /> }
  ]

  const themes: Array<{ id: AppSettings['theme']; label: string }> = [
    { id: 'dark', label: t.settings.general.themes.dark },
    { id: 'light', label: t.settings.general.themes.light },
    { id: 'dracula', label: t.settings.general.themes.dracula },
    { id: 'nord', label: t.settings.general.themes.nord },
    { id: 'hacker', label: t.settings.general.themes.hacker },
    { id: 'monokai', label: t.settings.general.themes.monokai }
  ]

  const statusVisible = saveStatus !== 'idle'
  const statusClass =
    saveStatus === 'saved' ? 'is-saved' :
    saveStatus === 'error' ? 'is-error' : ''
  const statusText =
    saveStatus === 'saving' ? t.settings.saving :
    saveStatus === 'saved' ? t.settings.saved :
    saveStatus === 'error' ? t.settings.saveError : ''

  return (
    <div className="panel settings-panel">
      <div className="settings-layout">
        <aside className="settings-nav">
          <div className="settings-nav-title">
            <Settings size={14} />
            {t.settings.title}
          </div>
          <div className="settings-nav-items">
            {navItems.map(item => (
              <button
                key={item.id}
                type="button"
                className={`settings-nav-btn${activeTab === item.id ? ' active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
          <div className="settings-nav-footer">
            <div className={`settings-save-status${statusVisible ? ' is-visible' : ''} ${statusClass}`.trim()}>
              {statusVisible && <span className="settings-save-dot" />}
              {statusText}
            </div>
            <button type="button" className="btn btn-secondary settings-nav-close" onClick={closePanel}>
              {t.settings.close}
            </button>
          </div>
        </aside>

        <div className="settings-content">
          {activeTab === 'general' && (
            <>
              <div className="settings-card">
                <h3>{t.settings.general.language}</h3>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select
                    className="form-select"
                    value={local.language || 'en'}
                    onChange={e => update({ language: e.target.value as 'en' | 'es' })}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>

              <div className="settings-card">
                <h3>{t.settings.general.pollingInterval}</h3>
                <div className="form-group">
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={1440}
                    value={local.pollingInterval}
                    onChange={e => update({ pollingInterval: Number(e.target.value) }, 300)}
                  />
                </div>

                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <label className="toggle" style={{ margin: 0 }}>
                      <div
                        className={`toggle-track ${local.fetchOnStartup !== false ? 'on' : ''}`}
                        onClick={() => update({ fetchOnStartup: local.fetchOnStartup === false })}
                      >
                        <div className="toggle-thumb" />
                      </div>
                    </label>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {t.settings.general.fetchOnStartup}
                    </span>
                    <select
                      className="form-select"
                      disabled={local.fetchOnStartup === false}
                      value={local.fetchOnStartupDelay ?? 15}
                      onChange={e => update({ fetchOnStartupDelay: Number(e.target.value) })}
                      style={{
                        width: 'auto',
                        minWidth: 140,
                        padding: '4px 8px',
                        fontSize: 12,
                        opacity: local.fetchOnStartup === false ? 0.5 : 1
                      }}
                    >
                      <option value={0}>{t.settings.general.fetchOnStartupDelays.s0}</option>
                      <option value={5}>{t.settings.general.fetchOnStartupDelays.s5}</option>
                      <option value={10}>{t.settings.general.fetchOnStartupDelays.s10}</option>
                      <option value={15}>{t.settings.general.fetchOnStartupDelays.s15}</option>
                      <option value={30}>{t.settings.general.fetchOnStartupDelays.s30}</option>
                      <option value={60}>{t.settings.general.fetchOnStartupDelays.m1}</option>
                      <option value={120}>{t.settings.general.fetchOnStartupDelays.m2}</option>
                      <option value={300}>{t.settings.general.fetchOnStartupDelays.m5}</option>
                    </select>
                  </div>

                  <label className="toggle" style={{ margin: 0 }}>
                    <div
                      className={`toggle-track ${local.pollOnlyWhenUnfocused ? 'on' : ''}`}
                      onClick={() => update({ pollOnlyWhenUnfocused: !local.pollOnlyWhenUnfocused })}
                    >
                      <div className="toggle-thumb" />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {t.settings.general.pollOnlyWhenUnfocused}
                    </span>
                  </label>
                </div>
              </div>

              <div className="settings-card">
                <h3>{t.settings.general.linksOpenIn}</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    className="form-select"
                    value={local.customBrowserPath ? 'custom' : 'default'}
                    onChange={async e => {
                      if (e.target.value === 'default') {
                        update({ customBrowserPath: '' })
                        return
                      }
                      const path = await window.api.pickBrowser()
                      if (path) update({ customBrowserPath: path })
                    }}
                    style={{ flex: 1 }}
                  >
                    <option value="default">{t.settings.general.openOptions.default}</option>
                    <option value="custom">{t.settings.general.openOptions.custom}</option>
                  </select>
                  <Tooltip label={t.settings.general.pickTooltip} placement="bottom">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={async () => {
                        const path = await window.api.pickBrowser()
                        if (path) update({ customBrowserPath: path })
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
                    >
                      {t.settings.general.pickBtn}
                    </button>
                  </Tooltip>
                </div>
                {local.customBrowserPath && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, wordBreak: 'break-all' }}>
                    {local.customBrowserPath}
                  </div>
                )}
              </div>

              <div className="settings-card">
                <h3>{t.settings.tabs.general}</h3>
                <label className="toggle">
                  <div
                    className={`toggle-track ${local.autoStart ? 'on' : ''}`}
                    onClick={() => update({ autoStart: !local.autoStart })}
                  >
                    <div className="toggle-thumb" />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.general.startWithWindows}</span>
                </label>
                <label className={`toggle ${!local.autoStart ? 'disabled' : ''}`}>
                  <div
                    className={`toggle-track ${local.startMinimized && local.autoStart ? 'on' : ''}`}
                    onClick={() => { if (local.autoStart) update({ startMinimized: !local.startMinimized }) }}
                  >
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
                <label className="toggle" style={{ marginBottom: 0 }}>
                  <div
                    className={`toggle-track ${local.minimizeToTray ? 'on' : ''}`}
                    onClick={() => update({ minimizeToTray: !local.minimizeToTray })}
                  >
                    <div className="toggle-thumb" />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.general.minimizeToTray}</span>
                </label>
              </div>
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <div className="settings-card">
                <h3>{t.settings.general.theme}</h3>
                <div className="theme-picker" role="radiogroup" aria-label={t.settings.general.theme}>
                  {themes.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      role="radio"
                      aria-checked={local.theme === theme.id}
                      className={`theme-option${local.theme === theme.id ? ' is-active' : ''}`}
                      onClick={() => {
                        document.documentElement.setAttribute('data-theme', theme.id)
                        try { localStorage.setItem('cyberfeeds-theme', theme.id) } catch { /* ignore */ }
                        update({ theme: theme.id })
                      }}
                    >
                      <span className={`theme-swatch theme-swatch--${theme.id}`} aria-hidden="true">
                        <span className="theme-swatch-accent" />
                      </span>
                      <span className="theme-option-label">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <h3>{t.settings.general.layout}</h3>
                <select
                  className="form-select"
                  value={local.layout}
                  onChange={e => update({ layout: e.target.value as AppSettings['layout'] })}
                >
                  <option value="three-panel">{t.settings.general.layouts.threePanel}</option>
                  <option value="two-panel">{t.settings.general.layouts.twoPanel}</option>
                  <option value="one-panel">{t.settings.general.layouts.onePanel}</option>
                  <option value="horizontal-split">{t.settings.general.layouts.horizontalSplit}</option>
                </select>
                <label className="toggle" style={{ marginTop: 12, marginBottom: 0 }}>
                  <div
                    className={`toggle-track ${local.showArticleThumbnails ? 'on' : ''}`}
                    onClick={() => update({ showArticleThumbnails: !local.showArticleThumbnails })}
                  >
                    <div className="toggle-thumb" />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.general.showThumbnails}</span>
                </label>
              </div>

              <div className="settings-card">
                <h3>{t.settings.fontSizes.title}</h3>
                <p className="settings-card-hint">{t.settings.fontSizes.explanation}</p>
                <div className="form-group">
                  <label className="form-label">
                    {t.settings.fontSizes.sidebar.replace('{size}', String(local.sidebarFontSize ?? 13))}
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={16}
                    step={1}
                    value={local.sidebarFontSize ?? 13}
                    onChange={e => {
                      const v = Number(e.target.value)
                      document.documentElement.style.setProperty('--sidebar-font-size', `${v}px`)
                      update({ sidebarFontSize: v }, 400)
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    {t.settings.fontSizes.articleList.replace('{size}', String(local.listFontSize ?? 13))}
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={16}
                    step={1}
                    value={local.listFontSize ?? 13}
                    onChange={e => {
                      const v = Number(e.target.value)
                      document.documentElement.style.setProperty('--list-font-size', `${v}px`)
                      update({ listFontSize: v }, 400)
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-card">
              <h3>{t.settings.notifications.title}</h3>
              <label className="toggle" style={{ marginBottom: 14 }}>
                <div
                  className={`toggle-track ${local.notifications.enabled ? 'on' : ''}`}
                  onClick={() => updateNotif({ enabled: !local.notifications.enabled })}
                >
                  <div className="toggle-thumb" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.notifications.enable}</span>
              </label>

              <label className="toggle" style={{ marginBottom: 14 }}>
                <div
                  className={`toggle-track ${local.notifications.showThumbnails ? 'on' : ''}`}
                  onClick={() => updateNotif({ showThumbnails: !local.notifications.showThumbnails })}
                >
                  <div className="toggle-thumb" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.notifications.showThumbnails}</span>
              </label>

              <label className="toggle" style={{ marginBottom: 14 }}>
                <div
                  className={`toggle-track ${local.notifications.disableOnFullscreen ? 'on' : ''}`}
                  onClick={() => updateNotif({ disableOnFullscreen: !local.notifications.disableOnFullscreen })}
                >
                  <div className="toggle-thumb" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.notifications.disableOnFullscreen}</span>
              </label>

              <div className="form-group">
                <label className="form-label">{t.settings.notifications.openBehavior}</label>
                <div className="open-behavior-picker">
                  <button
                    type="button"
                    className={`open-behavior-option${(local.notifications.openBehavior || 'app') === 'app' ? ' is-active' : ''}`}
                    onClick={() => updateNotif({ openBehavior: 'app' })}
                  >
                    {t.settings.notifications.openInApp}
                  </button>
                  <button
                    type="button"
                    className={`open-behavior-option${local.notifications.openBehavior === 'browser' ? ' is-active' : ''}`}
                    onClick={() => updateNotif({ openBehavior: 'browser' })}
                  >
                    {t.settings.notifications.openInBrowser}
                  </button>
                </div>
                <p className="settings-card-hint" style={{ margin: '8px 0 0' }}>
                  {t.settings.notifications.openBehaviorHint}
                </p>
              </div>

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
                      <option key={d.id} value={d.id}>{d.label}</option>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginTop: 4 }}>
                  {positions.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => updateNotif({ position: p })}
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
                      {t.settings.notifications.positions[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t.settings.notifications.duration}</label>
                <input
                  className="form-input"
                  type="number"
                  min={1000}
                  step={500}
                  value={local.notifications.duration}
                  onChange={e => updateNotif({ duration: Number(e.target.value) }, 300)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.settings.notifications.maxStack}</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={10}
                  value={local.notifications.maxStack}
                  onChange={e => updateNotif({ maxStack: Number(e.target.value) }, 300)}
                />
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
                <div
                  className={`toggle-track ${local.notifications.soundEnabled ? 'on' : ''}`}
                  onClick={() => updateNotif({ soundEnabled: !local.notifications.soundEnabled })}
                >
                  <div className="toggle-thumb" />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.notifications.soundEnabled}</span>
              </label>

              <div className="form-group" style={{ opacity: local.notifications.soundEnabled ? 1 : 0.5, pointerEvents: local.notifications.soundEnabled ? 'auto' : 'none' }}>
                <label className="form-label">{t.settings.notifications.alertSound}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
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
                    <Tooltip label={t.settings.notifications.resetToDefault} placement="bottom">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '2px 6px' }}
                        disabled={!local.notifications.soundEnabled}
                        onClick={() => updateNotif({ soundFile: null })}
                    >
                        ✕
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>

              <button
                type="button"
                className={`btn settings-preview-btn${testing ? ' is-sending' : ''}`}
                disabled={testing}
                onClick={async () => {
                  setTesting(true)
                  try {
                    await window.api.previewNotification(local.notifications)
                  } finally {
                    setTimeout(() => setTesting(false), 1600)
                  }
                }}
              >
                {testing ? <Zap size={15} /> : <Bell size={15} />}
                {testing ? t.settings.notifications.sendingBtn : t.settings.notifications.previewBtn}
              </button>
            </div>
          )}

          {activeTab === 'keyboard' && (
            <div className="settings-card">
              <h3>{t.settings.keyboard.title}</h3>
              <p className="settings-card-hint">{t.settings.keyboard.explanation}</p>

              {Object.entries(local.shortcuts).map(([key, shortcut]) => (
                <div key={key} className="shortcut-row">
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {t.settings.keyboard.actions[key as keyof typeof t.settings.keyboard.actions]}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <HotkeyRecorder
                      actionKey={key}
                      value={shortcut.accelerator}
                      onChange={newVal => {
                        const cur = localRef.current.shortcuts
                        const newShortcuts = { ...cur }
                        newShortcuts[key as keyof KeyboardShortcuts] = {
                          ...cur[key as keyof KeyboardShortcuts],
                          accelerator: newVal,
                          enabled: newVal !== ''
                        }
                        updateShortcuts(newShortcuts)
                      }}
                      shortcuts={local.shortcuts}
                      t={t}
                    />
                    {shortcut.accelerator ? (
                      <Tooltip label={t.settings.keyboard.clear} placement="bottom">
                        <button
                          type="button"
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
                            color: 'var(--orange)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                          onClick={() => {
                            const cur = localRef.current.shortcuts
                            const newShortcuts = { ...cur }
                            newShortcuts[key as keyof KeyboardShortcuts] = {
                              ...cur[key as keyof KeyboardShortcuts],
                              accelerator: '',
                              enabled: false
                            }
                            updateShortcuts(newShortcuts)
                          }}
                        >
                          <X size={12} />
                        </button>
                      </Tooltip>
                    ) : null}
                  </div>
                  <Tooltip label={shortcut.global ? t.settings.keyboard.scopeGlobalHint : t.settings.keyboard.scopeAppHint} placement="bottom">
                    <label
                      className="toggle"
                      style={{ margin: 0 }}
                    >
                      <div
                        className={`toggle-track ${shortcut.global ? 'on' : ''}`}
                        onClick={() => {
                          const cur = localRef.current.shortcuts
                          const newShortcuts = { ...cur }
                          newShortcuts[key as keyof KeyboardShortcuts] = {
                            ...cur[key as keyof KeyboardShortcuts],
                            global: !cur[key as keyof KeyboardShortcuts].global
                          }
                          updateShortcuts(newShortcuts)
                        }}
                      >
                        <div className="toggle-thumb" />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'inline-block', width: 42, textAlign: 'left' }}>
                        {shortcut.global ? t.settings.keyboard.scopeGlobal : t.settings.keyboard.scopeApp}
                      </span>
                    </label>
                  </Tooltip>
                </div>
              ))}

              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 11, marginTop: 12 }}
                onClick={async () => {
                  const result = await window.api.resetShortcuts() as { ok?: boolean; shortcuts?: KeyboardShortcuts }
                  if (result?.shortcuts) {
                    persist({ ...localRef.current, shortcuts: result.shortcuts })
                  }
                }}
              >
                {t.settings.keyboard.resetToDefaults}
              </button>
            </div>
          )}

          {activeTab === 'backupMaintenance' && (
            <>
              <div className="settings-card">
                <h3>{t.settings.backup.title}</h3>
                <p className="settings-card-hint">{t.settings.backup.explanation}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={handleExportBackup}>
                    {t.settings.backup.exportBtn}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleImportBackup} disabled={importing}>
                    {importing ? <div className="spinner" style={{ width: 13, height: 13 }} /> : t.settings.backup.importBtn}
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <h3>{t.settings.maintenance.title}</h3>
                <p className="settings-card-hint">{t.settings.maintenance.explanation}</p>
                <p className="settings-card-hint">{t.settings.maintenance.trashRetention}</p>
                <div className="form-group">
                  <label className="form-label">{t.settings.maintenance.deleteOlder}</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    value={local.cleanupReadDays}
                    onChange={e => update({ cleanupReadDays: Number(e.target.value) }, 300)}
                  />
                </div>
                <label className="toggle">
                  <div
                    className={`toggle-track ${local.autoCleanup ? 'on' : ''}`}
                    onClick={() => update({ autoCleanup: !local.autoCleanup })}
                  >
                    <div className="toggle-thumb" />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.settings.maintenance.autoClean}</span>
                </label>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ fontSize: 12, marginTop: 4 }}
                  onClick={() => window.api.cleanup(local.cleanupReadDays)}
                >
                  {t.settings.maintenance.runCleanBtn}
                </button>
              </div>

              <div className="settings-card">
                <h3>{t.sidebar.feedsDoctor}</h3>
                <p className="settings-card-hint">{t.doctor.explanation}</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={() => openPanel('doctor')}
                >
                  <Stethoscope size={14} />
                  {t.sidebar.feedsDoctor}
                </button>
              </div>
            </>
          )}
        </div>
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
