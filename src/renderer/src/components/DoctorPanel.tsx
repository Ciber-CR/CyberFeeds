import { useState } from 'react'
import { X, Activity, ShieldAlert, CheckCircle2, RefreshCw, Trash2, AlertTriangle, Stethoscope } from 'lucide-react'
import { useUIStore } from '../store/ui.store'
import { useFeedsStore } from '../store/feeds.store'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from './ConfirmDialog'
import { useTranslation } from '../hooks/useTranslation'

interface ScanResult {
  id: string
  title: string
  status: 'ok' | 'error'
  error?: string
}

export default function DoctorPanel(): JSX.Element {
  const { closePanel } = useUIStore()
  const { deleteFeed } = useFeedsStore()
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm()
  const { t } = useTranslation()
  
  const [results, setResults] = useState<ScanResult[]>(() => {
    const saved = localStorage.getItem('doctor_results')
    return saved ? JSON.parse(saved) : []
  })
  const [lastScan, setLastScan] = useState<string | null>(() => {
    return localStorage.getItem('doctor_last_scan')
  })
  const [scanning, setScanning] = useState(false)

  const runScan = async (): Promise<void> => {
    setScanning(true)
    const res = await window.api.scanFeeds()
    const now = new Date().toLocaleString()
    setResults(res)
    setLastScan(now)
    localStorage.setItem('doctor_results', JSON.stringify(res))
    localStorage.setItem('doctor_last_scan', now)
    scanningRefWorkaround(false)
  }

  const scanningRefWorkaround = (val: boolean) => {
    setScanning(val)
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await confirm({
      title: t.doctor.deleteFeedTitle,
      message: t.doctor.deleteFeedMsg,
      confirmText: t.sidebar.delete,
      cancelText: t.sidebar.cancel,
      variant: 'danger'
    })
    if (confirmed) {
      await deleteFeed(id)
      const newResults = results.filter(r => r.id !== id)
      setResults(newResults)
      localStorage.setItem('doctor_results', JSON.stringify(newResults))
    }
  }

  const errorCount = results.filter(r => r.status === 'error').length

  return (
    <div className="panel-overlay" onClick={e => e.target === e.currentTarget && closePanel()}>
      <div className="panel cyber-panel" style={{ width: 520 }}>
        <div className="panel-header">
          <Stethoscope size={18} color="var(--accent)" />
          <h2>{t.doctor.title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={18} /></button>
        </div>

        <div className="panel-body">
          <div style={{ background: 'var(--bg-2)', padding: '16px', borderRadius: 'var(--radius)', marginBottom: 20, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontSize: 13, margin: 0, color: 'var(--text-primary)' }}>{t.doctor.scanSubtitle}</h3>
              {lastScan && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {t.doctor.lastRun.replace('{time}', lastScan)}
                </div>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {t.doctor.explanation}
            </p>
            <button 
              className="btn btn-secondary" 
              onClick={runScan} 
              disabled={scanning}
              style={{ width: '100%', gap: 8 }}
            >
              <RefreshCw size={14} className={scanning ? 'spin-icon' : ''} />
              {scanning ? t.doctor.scanning : t.doctor.startBtn}
            </button>
          </div>

          {results.length > 0 && (
            <div className="panel-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{t.doctor.resultsTitle}</h3>
                <div style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: errorCount > 0 ? 'var(--red-subtle)' : 'var(--green-subtle)', color: errorCount > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {errorCount === 0 ? t.doctor.noIssues : errorCount === 1 ? `1 ${t.doctor.issueFound}` : `${errorCount} ${t.doctor.issuesFound}`}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map(res => (
                  <div key={res.id} style={{ 
                    background: 'var(--bg-2)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius)', 
                    border: '1px solid',
                    borderColor: res.status === 'error' ? 'rgba(248,81,73,0.2)' : 'var(--border-muted)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {res.status === 'ok' ? (
                        <CheckCircle2 size={16} color="var(--green)" />
                      ) : (
                        <ShieldAlert size={16} color="var(--red)" />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {res.title}
                        </div>
                        {res.status === 'error' && (
                          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {res.error}
                          </div>
                        )}
                      </div>
                      {res.status === 'error' && (
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(res.id)} style={{ color: 'var(--red)' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 && !scanning && (
            <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
              <Activity size={48} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>{t.doctor.readyMsg}</p>
            </div>
          )}
        </div>
        
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)' }}>
          <AlertTriangle size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {t.doctor.warningNote}
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
    </div>
  )
}
