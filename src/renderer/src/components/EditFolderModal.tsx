import { useState, useEffect } from 'react'
import { X, Edit2 } from 'lucide-react'
import { useFeedsStore } from '../store/feeds.store'
import { useUIStore } from '../store/ui.store'
import { useTranslation } from '../hooks/useTranslation'
import { useOverlayDismiss } from '../hooks/useOverlayDismiss'

export default function EditFolderModal(): JSX.Element | null {
  const { folders, updateFolder } = useFeedsStore()
  const { closePanel, editFolderId } = useUIStore()
  const { t } = useTranslation()
  const overlayDismiss = useOverlayDismiss(closePanel)

  const folder = folders.find(f => f.id === editFolderId)

  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (folder) {
      setName(folder.name)
    }
  }, [folder])

  if (!folder) return null

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await updateFolder(folder.id, name.trim())
      closePanel()
    } catch (err: any) {
      setError(err.message || t.editFolder.failedMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" {...overlayDismiss}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <Edit2 size={16} style={{ color: 'var(--accent)' }} />
          <h2>{t.editFolder.title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={15} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">{t.editFolder.nameLabel}</label>
            <input
              className="form-input"
              placeholder={t.editFolder.placeholder}
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          {error && <div className="error-text">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={closePanel}>{t.sidebar.cancel}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? <div className="spinner" style={{ width: 13, height: 13 }} /> : t.editFolder.saveBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
