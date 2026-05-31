import { useState, useCallback } from 'react'

interface AlertOptions {
  title: string
  message: string
  confirmText?: string
  variant?: 'success' | 'info' | 'warning' | 'error'
}

interface AlertState extends AlertOptions {
  isOpen: boolean
  resolve?: () => void
}

export function useAlert() {
  const [state, setState] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'OK',
    variant: 'info'
  })

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        ...options,
        resolve
      })
    })
  }, [])

  const handleClose = useCallback(() => {
    state.resolve?.()
    setState(prev => ({ ...prev, isOpen: false }))
  }, [state.resolve])

  return {
    alert,
    alertState: state,
    handleClose
  }
}
