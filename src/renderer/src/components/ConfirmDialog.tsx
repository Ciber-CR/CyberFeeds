import { useEffect } from 'react'
import { AlertTriangle, Info, Trash2, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element | null {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        onConfirm()
      }
    }

    window.addEventListener('keydown', handleEscape)
    window.addEventListener('keydown', handleEnter)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('keydown', handleEnter)
    }
  }, [isOpen, onCancel, onConfirm])

  if (!isOpen) return null

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 size={24} style={{ color: 'var(--red)' }} />
      case 'warning':
        return <AlertTriangle size={24} style={{ color: 'var(--orange)' }} />
      default:
        return <Info size={24} style={{ color: 'var(--accent)' }} />
    }
  }

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'confirm-dialog-btn confirm-dialog-btn-danger'
      case 'warning':
        return 'confirm-dialog-btn confirm-dialog-btn-warning'
      default:
        return 'confirm-dialog-btn confirm-dialog-btn-primary'
    }
  }

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {getIcon()}
            <h2 className="confirm-dialog-title">{title}</h2>
          </div>
          <button className="confirm-dialog-close" onClick={onCancel} title="Close">
            <X size={18} />
          </button>
        </div>
        <div className="confirm-dialog-body">
          <p className="confirm-dialog-message">{message}</p>
        </div>
        <div className="confirm-dialog-footer">
          <button className="confirm-dialog-btn confirm-dialog-btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={getConfirmButtonClass()} onClick={onConfirm} autoFocus>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
