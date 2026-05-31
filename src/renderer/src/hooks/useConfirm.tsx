import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve?: (value: boolean) => void
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'info'
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        ...options,
        resolve
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState(prev => ({ ...prev, isOpen: false }))
  }, [state.resolve])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState(prev => ({ ...prev, isOpen: false }))
  }, [state.resolve])

  return {
    confirm,
    confirmState: state,
    handleConfirm,
    handleCancel
  }
}
