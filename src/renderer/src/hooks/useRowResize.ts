import { useState, useEffect, useCallback } from 'react'

/**
 * High-performance row resize hook for layouts stacked vertically.
 * - During drag: updates CSS variable directly on <html> — zero React re-renders
 * - On drag end: persists to localStorage and commits state
 */
export function useRowResize(
  key: string,
  defaultHeight: number,
  min: number,
  max: number
): { height: number; startDrag: (e: React.MouseEvent) => void } {
  const storageKey = `cyberfeeds-row-${key}`
  const cssVar = `--row-${key}`

  const [height, setHeight] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) return Math.min(max, Math.max(min, Number(stored)))
    } catch {
      /* ignore */
    }
    return defaultHeight
  })

  useEffect(() => {
    document.documentElement.style.setProperty(cssVar, `${height}px`)
  }, [height, cssVar])

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startY = e.clientY
      const startH = height

      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'

      const onMove = (me: MouseEvent): void => {
        const newH = Math.min(max, Math.max(min, startH + me.clientY - startY))
        document.documentElement.style.setProperty(cssVar, `${newH}px`)
      }

      const onUp = (me: MouseEvent): void => {
        const newH = Math.min(max, Math.max(min, startH + me.clientY - startY))
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        setHeight(newH)
        try {
          localStorage.setItem(storageKey, String(newH))
        } catch {
          /* ignore */
        }
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [height, cssVar, min, max, storageKey]
  )

  return { height, startDrag }
}
