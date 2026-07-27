import React, { useState, useEffect } from 'react'
import { X, Globe } from 'lucide-react'
import { useFeedsStore } from '../store/feeds.store'
import { useUIStore } from '../store/ui.store'
import { useTranslation } from '../hooks/useTranslation'
import { useOverlayDismiss } from '../hooks/useOverlayDismiss'

export default function AddFeedModal(): JSX.Element {
  const [url, setUrl] = useState('')
  const [folderId, setFolderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [error, setError] = useState('')
  const customTitleRef = React.useRef<HTMLInputElement>(null)
  const urlRef = React.useRef<HTMLInputElement>(null)
  const { t, language } = useTranslation()

  useEffect(() => { urlRef.current?.focus() }, [])
  const { folders, addFeed } = useFeedsStore()
  const { closePanel } = useUIStore()
  const overlayDismiss = useOverlayDismiss(closePanel)

  const handlePreview = async (): Promise<void> => {
    if (!url.trim()) return
    setPreviewing(true)
    setError('')
    const result = await window.api.previewFeed(url)
    setPreviewing(false)
    if (result.error) { setError(result.error); return }
    setPreview(result)
  }

  const handleAdd = async (): Promise<void> => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    const finalTitle = customTitleRef.current?.value || ''
    const result = await addFeed(url, folderId, finalTitle)
    setLoading(true) // Keep loading spinner active until unmounted/closed
    if (result.error) {
      if (result.error === 'Feed already exists') {
        setError(language === 'es' ? 'El feed ya existe' : result.error)
      } else {
        setError(result.error)
      }
      setLoading(false)
      return
    }
    closePanel()
  }

  return (
    <div className="modal-overlay" {...overlayDismiss}>
      <div className="modal">
        <div className="modal-header">
          <Globe size={16} style={{ color: 'var(--accent)' }} />
          <h2>{t.addFeed.title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={15} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">{t.addFeed.urlLabel}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={urlRef}
                className="form-input"
                style={{ flex: 1 }}
                placeholder="https://example.com/feed.xml"
                value={url}
                onChange={e => { setUrl(e.target.value); setPreview(null); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handlePreview()}
              />
              <button className="btn btn-secondary" onClick={handlePreview} disabled={previewing || !url} style={{ flexShrink: 0 }}>
                {previewing ? <div className="spinner" style={{ width: 13, height: 13 }} /> : t.addFeed.previewBtn}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t.addFeed.folderLabel}</label>
            <select className="form-select" value={folderId} onChange={e => setFolderId(e.target.value)}>
              <option value="">{t.addFeed.noFolder}</option>
              {[...folders].sort((a, b) => a.name.localeCompare(b.name)).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}

          {preview && (
            <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 11, opacity: 0.7, color: 'var(--accent)' }}>{t.addFeed.editNameLabel}</label>
                <input 
                  ref={customTitleRef}
                  className="form-input" 
                  style={{ 
                    fontSize: 14, 
                    fontWeight: 600, 
                    padding: '8px 12px', 
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                  }}
                  defaultValue={preview.title || ''}
                  placeholder={t.addFeed.placeholderName}
                  autoComplete="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                />
              </div>
              {preview.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, opacity: 0.8 }}>{preview.description}</div>}
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>{t.addFeed.previewItemsLabel}</div>
              {preview.items?.map((item: any, i: number) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0', borderTop: i > 0 ? '1px solid var(--border-muted)' : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  • {item.title}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={closePanel}>{t.sidebar.cancel}</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={loading || !url}>
            {loading ? <div className="spinner" style={{ width: 13, height: 13 }} /> : t.addFeed.title}
          </button>
        </div>
      </div>
    </div>
  )
}
