import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings } from './useSettings'

function todayKey(): string {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatReadingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function useDailyReadingTime(active: boolean) {
  const { settings, save } = useSettings()
  const sessionMsRef = useRef(0)
  const lastTickRef = useRef<number | null>(null)
  const [totalMs, setTotalMs] = useState(0)

  const getStoredMs = useCallback(() => {
    const key = todayKey()
    if (settings?.readingTimeDate === key) {
      return settings.readingTimeTodayMs ?? 0
    }
    return 0
  }, [settings?.readingTimeDate, settings?.readingTimeTodayMs])

  const flush = useCallback(async () => {
    const session = sessionMsRef.current
    if (session <= 0) return

    const key = todayKey()
    const storedMs = settings?.readingTimeDate === key ? (settings.readingTimeTodayMs ?? 0) : 0
    sessionMsRef.current = 0
    await save({ readingTimeDate: key, readingTimeTodayMs: storedMs + session })
  }, [save, settings?.readingTimeDate, settings?.readingTimeTodayMs])

  useEffect(() => {
    sessionMsRef.current = 0
    lastTickRef.current = null
    setTotalMs(getStoredMs())
  }, [getStoredMs])

  useEffect(() => {
    if (!active) {
      void flush()
      lastTickRef.current = null
      return
    }

    const tick = (now: number) => {
      if (document.visibilityState !== 'visible') {
        lastTickRef.current = null
        return
      }

      if (lastTickRef.current != null) {
        const delta = now - lastTickRef.current
        if (delta > 0 && delta < 10_000) {
          sessionMsRef.current += delta
          setTotalMs(getStoredMs() + sessionMsRef.current)
        }
      }

      lastTickRef.current = now
    }

    lastTickRef.current = performance.now()

    const interval = window.setInterval(() => tick(performance.now()), 1000)
    const persistInterval = window.setInterval(() => void flush(), 30_000)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        tick(performance.now())
        void flush()
        lastTickRef.current = null
        return
      }
      lastTickRef.current = performance.now()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      clearInterval(persistInterval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      tick(performance.now())
      void flush()
    }
  }, [active, flush, getStoredMs])

  return {
    totalMs,
    formatted: formatReadingTime(totalMs),
  }
}
