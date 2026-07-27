import { useRef, useCallback, type MouseEvent } from 'react'

/**
 * Dismiss an overlay only when both press and release started on the backdrop.
 * Prevents closing while selecting text and dragging outside the modal.
 */
export function useOverlayDismiss(onDismiss: () => void): {
  onMouseDown: (e: MouseEvent<HTMLElement>) => void
  onClick: (e: MouseEvent<HTMLElement>) => void
} {
  const startedOnOverlay = useRef(false)

  const onMouseDown = useCallback((e: MouseEvent<HTMLElement>) => {
    startedOnOverlay.current = e.target === e.currentTarget
  }, [])

  const onClick = useCallback((e: MouseEvent<HTMLElement>) => {
    if (startedOnOverlay.current && e.target === e.currentTarget) {
      onDismiss()
    }
    startedOnOverlay.current = false
  }, [onDismiss])

  return { onMouseDown, onClick }
}
