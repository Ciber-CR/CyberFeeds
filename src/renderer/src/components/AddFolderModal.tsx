import { useState } from 'react'
import { X, FolderPlus } from 'lucide-react'
import { useFeedsStore } from '../store/feeds.store'
import { useUIStore } from '../store/ui.store'

export default function AddFolderModal(): JSX.Element {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { addFolder } = useFeedsStore()
  const { closePanel } = useUIStore()

  const handleAdd = async (): Promise<void> => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await addFolder(name.trim())
      closePanel()
    } catch (err: any) {
      setError(err.message || 'Failed to add folder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closePanel()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <FolderPlus size={16} style={{ color: 'var(--accent)' }} />
          <h2>New Folder</h2>
          <button className="btn btn-ghost btn-icon" onClick={closePanel}><X size={15} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Folder Name</label>
            <input
              className="form-input"
              placeholder="News, Tech, etc."
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          {error && <div className="error-text">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={closePanel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={loading || !name.trim()}>
            {loading ? <div className="spinner" style={{ width: 13, height: 13 }} /> : 'Create Folder'}
          </button>
        </div>
      </div>
    </div>
  )
}
