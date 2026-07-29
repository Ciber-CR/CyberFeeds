import { useEffect } from 'react'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import { useOverlayDismiss } from '../hooks/useOverlayDismiss'
import Tooltip from './Tooltip'
import { useTranslation } from '../hooks/useTranslation'

interface AlertDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  variant?: 'success' | 'info' | 'warning' | 'error'
  onClose: () => void
}

export default function AlertDialog({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  variant = 'info',
  onClose
}: AlertDialogProps): JSX.Element | null {
  const { t } = useTranslation()
  const overlayDismiss = useOverlayDismiss(onClose)

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    window.addEventListener('keydown', handleEnter)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('keydown', handleEnter)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle2 size={24} style={{ color: 'var(--green)' }} />
      case 'error':
        return <XCircle size={24} style={{ color: 'var(--red)' }} />
      case 'warning':
        return <AlertTriangle size={24} style={{ color: 'var(--orange)' }} />
      default:
        return <Info size={24} style={{ color: 'var(--accent)' }} />
    }
  }

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'success':
        return 'alert-dialog-btn alert-dialog-btn-success'
      case 'error':
        return 'alert-dialog-btn alert-dialog-btn-danger'
      case 'warning':
        return 'alert-dialog-btn alert-dialog-btn-warning'
      default:
        return 'alert-dialog-btn alert-dialog-btn-primary'
    }
  }

  return (
    <div className="confirm-dialog-overlay" {...overlayDismiss}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {getIcon()}
            <h2 className="confirm-dialog-title">{title}</h2>
          </div>
          <Tooltip label={t.common.close} placement="left">
            <button className="confirm-dialog-close" onClick={onClose}>
              <X size={18} />
            </button>
          </Tooltip>
        </div>
        <div className="confirm-dialog-body">
          <p className="confirm-dialog-message">{message}</p>
        </div>
        <div className="confirm-dialog-footer">
          <button className={getConfirmButtonClass()} onClick={onClose} autoFocus>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
