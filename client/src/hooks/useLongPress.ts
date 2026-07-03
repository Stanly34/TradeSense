import { useCallback, useRef } from 'react'

export function useLongPress(callback: () => void, ms = 600) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const isLongPress = useRef(false)

  const start = useCallback(() => {
    isLongPress.current = false
    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      callback()
    }, ms)
  }, [callback, ms])

  const stop = useCallback(() => {
    clearTimeout(timerRef.current)
  }, [])

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: (e: React.TouchEvent) => {
      stop()
      if (isLongPress.current) e.preventDefault()
    },
    onTouchMove: stop,
    isLongPress,
  }
}
