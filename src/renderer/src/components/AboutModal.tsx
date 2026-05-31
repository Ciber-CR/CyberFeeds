import { useState, useEffect } from 'react'
import { X, Cpu, Code2, Database, Zap, Rss, Github, Folder, RefreshCw, Download, CheckCircle2 } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useSettingsStore } from '../store/settings.store'

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

  useEffect(() => {
    window.api.getVersions().then((v: { app: string }) => setAppVersion(v.app))
    const off = window.api.onUpdateStatus((s) => setStatus(s as UpdateStatus))
    return off
  }, [])

  const handleCheck = async (): Promise<void> => {
    setStatus({ state: 'checking' })
    const res = await window.api.checkForUpdates()
    if (!res?.ok) setStatus({ state: 'error', message: res?.error || 'Update check failed' })
  }

  const handleDownload = async (): Promise<void> => {
    await window.api.downloadUpdate()
  }

  const handleInstall = (): void => {
    window.api.installUpdate()
  }

  const techStack = [
    { name: 'Electron', version: '34.3.0', icon: <Cpu size={14} />, desc: 'Native Desktop Shell' },
    { name: 'React', version: '19.2.1', icon: <Code2 size={14} />, desc: 'UI Library' },
    { name: 'Vite', version: '6.3.5', icon: <Zap size={14} />, desc: 'Build System' },
    { name: 'SQLite', version: '11.9.1', icon: <Database size={14} />, desc: 'Local Database' },
    { name: 'Zustand', version: '5.0.4', icon: <Zap size={14} />, desc: 'State Management' },
    { name: 'Lucide', version: '0.511.0', icon: <Zap size={14} />, desc: 'Iconography' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closePanel()}>
      <div className="modal" style={{ width: 500, background: 'linear-gradient(135deg, var(--bg-1), var(--bg-0))', border: '1px solid var(--accent-subtle)' }}>
        <div className="modal-header" style={{ border: 'none', padding: '20px 20px 0' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center', padding: '0 32px 32px' }}>
          {/* Animated Logo Container */}
          <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
            <div style={{
              position: 'absolute', inset: 0, 
              background: 'var(--accent-subtle)', 
              borderRadius: '50%', 
              animation: 'pulse 3s infinite',
              filter: 'blur(10px)'
            }} />
            <div style={{
              position: 'relative',
              width: 80, height: 80,
              background: 'var(--bg-2)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--accent)',
              boxShadow: '0 0 20px rgba(88,166,255,0.2)'
            }}>
              <Rss size={42} color="var(--accent)" style={{ animation: 'float 4s ease-in-out infinite' }} />
            </div>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Cyber<span style={{ color: 'var(--accent)' }}>Feeds</span>
          </h1>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
            Version {appVersion || '…'}
          </div>

          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
            A high-performance, minimalist RSS reader designed for power users who value speed, 
            privacy, and a clean reading experience.
          </p>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 1, flex: 1, background: 'var(--accent-subtle)' }} />
              Engine Core
              <div style={{ height: 1, flex: 1, background: 'var(--accent-subtle)' }} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {techStack.map(tech => (
                <div key={tech.name} style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '10px 12px', 
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <div style={{ color: 'var(--accent)' }}>{tech.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{tech.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>v{tech.version}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 1, flex: 1, background: 'var(--accent-subtle)' }} />
              Updates
              <div style={{ height: 1, flex: 1, background: 'var(--accent-subtle)' }} />
            </div>

            <UpdateStatusLine status={status} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
              {status.state === 'available' && (
                <button className="btn btn-primary" style={{ fontSize: 12, gap: 8, padding: '10px 20px' }} onClick={handleDownload}>
                  <Download size={14} /> Download {status.version}
                </button>
              )}
              {status.state === 'downloaded' ? (
                <button className="btn btn-primary" style={{ fontSize: 12, gap: 8, padding: '10px 20px' }} onClick={handleInstall}>
                  <CheckCircle2 size={14} /> Restart & Install
                </button>
              ) : (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, gap: 8, padding: '10px 20px' }}
                  onClick={handleCheck}
                  disabled={status.state === 'checking' || status.state === 'downloading'}
                >
                  <RefreshCw size={14} className={status.state === 'checking' ? 'spin' : ''} /> Check for updates
                </button>
              )}
            </div>

            <label className="toggle" style={{ justifyContent: 'center', marginTop: 14 }}>
              <div className={`toggle-track ${settings.autoUpdate ? 'on' : ''}`}
                onClick={() => update({ autoUpdate: !settings.autoUpdate })}>
                <div className="toggle-thumb" />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {settings.autoUpdate ? 'Automatic updates' : 'Manual updates only'}
              </span>
            </label>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
             <button className="btn btn-secondary" style={{ fontSize: 12, gap: 8, padding: '10px 24px' }} onClick={() => window.api.openDataFolder()}>
               <Folder size={14} /> Open Data Folder
             </button>
          </div>
        </div>

        <div style={{ 
          padding: '12px 20px', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 10, 
          color: 'var(--text-muted)', 
          borderTop: '1px solid var(--border-muted)',
          background: 'rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 600, letterSpacing: '0.05em' }}>
            © CyberGems • 2026
          </div>
          <button 
            className="btn btn-ghost btn-icon" 
            style={{ width: 24, height: 24, color: 'inherit' }}
            onClick={() => window.api.openExternal('https://github.com/Cybergems/CyberFeeds')}
            title="GitHub Repository"
          >
            <Github size={14} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  )
}

function UpdateStatusLine({ status }: { status: UpdateStatus }): JSX.Element | null {
  const map: Record<string, { text: string; color: string }> = {
    idle: { text: '', color: 'var(--text-muted)' },
    checking: { text: 'Checking for updates…', color: 'var(--text-secondary)' },
    'not-available': { text: 'You’re on the latest version.', color: 'var(--green)' },
    available: { text: 'An update is available.', color: 'var(--accent)' },
    downloaded: { text: 'Update ready to install.', color: 'var(--green)' },
    error: { text: 'Could not check for updates.', color: 'var(--red)' }
  }
  if (status.state === 'idle') return null
  if (status.state === 'downloading') {
    return (
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
        Downloading… {status.percent}%
      </div>
    )
  }
  const info = map[status.state]
  return (
    <div style={{ textAlign: 'center', fontSize: 12, color: info.color }}>
      {info.text}
    </div>
  )
}
