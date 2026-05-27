import { useCallback, useEffect, useRef } from 'react'

interface LongPressPoint {
  x: number
  y: number
}

interface UseLongPressOptions {
  delay?: number
  moveThreshold?: number
  disabled?: boolean
}

export function useLongPress(
  onLongPress: (point: LongPressPoint) => void,
  { delay = 500, moveThreshold = 12, disabled = false }: UseLongPressOptions = {},
) {
  const onLongPressRef = useRef(onLongPress)
  onLongPressRef.current = onLongPress

  const timerRef = useRef<number | null>(null)
  const startRef = useRef<LongPressPoint | null>(null)
  const suppressClickRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled || event.button !== 0) return
      suppressClickRef.current = false
      startRef.current = { x: event.clientX, y: event.clientY }
      clearTimer()
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        suppressClickRef.current = true
        onLongPressRef.current({ x: event.clientX, y: event.clientY })
        if (navigator.vibrate) navigator.vibrate(10)
      }, delay)
    },
    [clearTimer, delay, disabled],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const start = startRef.current
      if (!start || timerRef.current == null) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (Math.hypot(dx, dy) > moveThreshold) clearTimer()
    },
    [clearTimer, moveThreshold],
  )

  const onPointerEnd = useCallback(() => {
    clearTimer()
    startRef.current = null
  }, [clearTimer])

  const guardClick = useCallback((event: React.MouseEvent) => {
    if (!suppressClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }, [])

  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return
      event.preventDefault()
      event.stopPropagation()
      onLongPressRef.current({ x: event.clientX, y: event.clientY })
    },
    [disabled],
  )

  return {
    longPressProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
    contextMenuProps: { onContextMenuCapture: onContextMenu },
    guardClick,
  }
}
