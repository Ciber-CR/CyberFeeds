import React from 'react'
import { X, Cpu, Code2, Database, Zap, Rss, Github, Folder } from 'lucide-react'
import { useUIStore } from '../store/ui.store'

export default function AboutModal(): JSX.Element {
  const { closePanel } = useUIStore()

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
            Version 2.0.0 "Obsidian"
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

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
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
            Carlos@CiberCR • 2026
          </div>
          <button 
            className="btn btn-ghost btn-icon" 
            style={{ width: 24, height: 24, color: 'inherit' }}
            onClick={() => window.api.openExternal('https://github.com')}
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
      `}</style>
    </div>
  )
}
