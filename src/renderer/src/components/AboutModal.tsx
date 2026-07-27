import { useState, useEffect, type MouseEvent } from 'react'
import { X, Rss, Github, Folder, RefreshCw, Download, CheckCircle2 } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useSettingsStore } from '../store/settings.store'
import { useTranslation } from '../hooks/useTranslation'

type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

export default function AboutModal(): JSX.Element {
  const { closePanel } = useUIStore()
  const { settings, update } = useSettingsStore()
  const [appVersion, setAppVersion] = useState('')
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const { t } = useTranslation()

  useEffect(() => {
    window.api.getVersions().then((v: { app: string }) => setAppVersion(v.app))
    const off = window.api.onUpdateStatus((s) => setStatus(s as UpdateStatus))
    return off
  }, [])

  const handleCheck = async (): Promise<void> => {
    setStatus({ state: 'checking' })
    try {
      const res = await window.api.checkForUpdates()
      if (!res?.ok) {
        setStatus({ state: 'error', message: res?.error || 'Update check failed' })
        return
      }
      // Safety net: if no update-available / update-not-available event settled the
      // UI, don't leave it spinning on "Checking…" forever.
      setStatus(prev =>
        prev.state === 'checking'
          ? { state: 'not-available', version: res.version || appVersion }
          : prev
      )
    } catch (e) {
      setStatus({ state: 'error', message: String((e as Error)?.message || e) })
    }
  }

  const handleDownload = async (): Promise<void> => {
    await window.api.downloadUpdate()
  }

  const handleInstall = (): void => {
    window.api.installUpdate()
  }

  const handleClose = (e?: MouseEvent): void => {
    e?.stopPropagation()
    closePanel()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div
        className="modal about-modal"
        style={{
          width: 440,
          maxHeight: 'min(90vh, 640px)',
          background: 'linear-gradient(160deg, var(--bg-1), var(--bg-0))',
          border: '1px solid var(--accent-subtle)',
          overflow: 'hidden'
        }}
      >
        <div className="modal-header" style={{ border: 'none', padding: '16px 16px 0', flexShrink: 0 }}>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={handleClose}
            title={t.about.close}
            aria-label={t.about.close}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body about-modal-body" style={{ textAlign: 'center', padding: '0 28px 20px', overflowY: 'auto' }}>
          <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 16px' }}>
            <div style={{
              position: 'absolute', inset: -4,
              background: 'var(--accent-subtle)',
              borderRadius: '50%',
              filter: 'blur(12px)'
            }} />
            <div style={{
              position: 'relative',
              width: 72, height: 72,
              background: 'var(--bg-2)',
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--accent)',
              boxShadow: '0 0 18px color-mix(in srgb, var(--accent) 25%, transparent)'
            }}>
              <Rss size={36} color="var(--accent)" />
            </div>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Cyber<span style={{ color: 'var(--accent)' }}>Feeds</span>
          </h1>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14
          }}>
            {t.about.version.replace('{version}', appVersion || '…')}
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 24 }}>
            {t.about.desc}
          </p>

          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8
            }}>
              <div style={{ height: 1, flex: 1, background: 'var(--accent-subtle)' }} />
              {t.about.maintenance}
              <div style={{ height: 1, flex: 1, background: 'var(--accent-subtle)' }} />
            </div>

            <UpdateStatusLine status={status} t={t} />

            <div className="about-maintenance">
              {status.state === 'available' ? (
                <button type="button" className="btn btn-primary about-action-btn" onClick={handleDownload}>
                  <Download size={14} />
                  <span>{t.about.downloadBtn}</span>
                </button>
              ) : status.state === 'downloaded' ? (
                <button type="button" className="btn btn-primary about-action-btn" onClick={handleInstall}>
                  <CheckCircle2 size={14} />
                  <span>{t.about.installBtn}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary about-action-btn"
                  onClick={handleCheck}
                  disabled={status.state === 'checking' || status.state === 'downloading'}
                >
                  <RefreshCw size={14} className={status.state === 'checking' ? 'spin' : ''} />
                  <span>{t.about.checkUpdates}</span>
                </button>
              )}

              <button type="button" className="btn btn-secondary about-action-btn" onClick={() => window.api.openDataFolder()}>
                <Folder size={14} />
                <span>{t.about.openFolder}</span>
              </button>

              <label className="toggle about-auto-update">
                <div
                  className={`toggle-track ${settings.autoUpdate ? 'on' : ''}`}
                  onClick={() => update({ autoUpdate: !settings.autoUpdate })}
                >
                  <div className="toggle-thumb" />
                </div>
                <span>{t.about.autoUpdates}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="about-modal-footer">
          <div style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
            © CyberGems • 2026
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            style={{ width: 28, height: 28, color: 'inherit' }}
            onClick={() => window.api.openExternal('https://github.com/Cybergems/CyberFeeds')}
            title={t.about.githubTooltip}
            aria-label={t.about.githubTooltip}
          >
            <Github size={14} />
          </button>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  )
}

function UpdateStatusLine({ status, t }: { status: UpdateStatus; t: any }): JSX.Element | null {
  const map: Record<string, { text: string; color: string }> = {
    idle: { text: '', color: 'var(--text-muted)' },
    checking: { text: t.about.statuses.checking, color: 'var(--text-secondary)' },
    'not-available': { text: t.about.statuses.latest, color: 'var(--green)' },
    available: { text: t.about.statuses.available, color: 'var(--accent)' },
    downloaded: { text: t.about.statuses.downloaded, color: 'var(--green)' },
    error: { text: t.about.statuses.error, color: 'var(--red)' }
  }
  if (status.state === 'idle') return null
  if (status.state === 'downloading') {
    return (
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
        {t.about.statuses.downloading.replace('{percent}', String(status.percent))}
      </div>
    )
  }
  const info = map[status.state]
  return (
    <div style={{ textAlign: 'center', fontSize: 12, color: info.color, marginBottom: 10 }}>
      {info.text}
      {status.state === 'error' && status.message && (
        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-muted)', wordBreak: 'break-word' }}>
          {status.message}
        </div>
      )}
    </div>
  )
}
