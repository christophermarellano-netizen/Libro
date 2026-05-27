import { useCallback, useEffect, useRef, useState } from 'react'
import ePub, { type Rendition } from 'epubjs'
import { db } from '../db'
import { chapterLabelForHref, loadToc, searchEpub } from '../lib/epubSearch'
import type { ReaderTheme, SearchHit, TocEntry } from '../types'

type EpubBookRef = Parameters<typeof loadToc>[0]

export interface ReaderSettings {
  fontSize: number
  fontFamily: string
  theme: ReaderTheme
  lineSpacing: number
}

function waitForFirstRender(rendition: Rendition, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      ;(rendition as Rendition & { off?: (event: string, fn: () => void) => void }).off?.(
        'rendered',
        onRendered,
      )
      window.clearTimeout(timer)
      resolve()
    }

    const onRendered = () => finish()
    const timer = window.setTimeout(finish, timeoutMs)

    rendition.on('rendered', onRendered)
  })
}

export function useReader(
  epubBlob: Blob | undefined,
  bookId: number | undefined,
  settings: ReaderSettings,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<ReturnType<typeof ePub> | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const tocRef = useRef<TocEntry[]>([])
  const initGenerationRef = useRef(0)
  const [retryCount, setRetryCount] = useState(0)
  const [ready, setReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [percentage, setPercentage] = useState(0)
  const [currentCfi, setCurrentCfi] = useState('')
  const [chapterLabel, setChapterLabel] = useState('')

  const updateChapterLabel = useCallback((href?: string) => {
    if (!href || tocRef.current.length === 0) return
    const label = chapterLabelForHref(tocRef.current, href)
    if (label) setChapterLabel(label)
  }, [])

  const applyTheme = useCallback((rendition: Rendition, theme: ReaderTheme) => {
    const styles: Record<ReaderTheme, Record<string, Record<string, string>>> = {
      light: { body: { background: '#fff !important', color: '#1a1a1a !important' } },
      dark: { body: { background: '#1c1c1e !important', color: '#f5f5f5 !important' } },
      sepia: { body: { background: '#f4ecd8 !important', color: '#5b4636 !important' } },
    }
    rendition.themes.register(theme, styles[theme])
    rendition.themes.select(theme)
  }, [])

  const applySettings = useCallback(
    (rendition: Rendition) => {
      applyTheme(rendition, settings.theme)
      rendition.themes.fontSize(`${settings.fontSize}%`)

      const usePublisherFont =
        settings.fontFamily === 'original' || settings.fontFamily === 'Georgia, serif'
      if (usePublisherFont) {
        rendition.themes.removeOverride('font-family')
      } else {
        rendition.themes.font(settings.fontFamily)
      }

      rendition.themes.override('line-height', String(settings.lineSpacing), true)
    },
    [settings.fontSize, settings.fontFamily, settings.lineSpacing, settings.theme, applyTheme],
  )

  const resizeRendition = useCallback(() => {
    const container = containerRef.current
    const rendition = renditionRef.current as (Rendition & {
      resize?: (width: number, height: number) => void
    }) | null
    if (!container || !rendition?.resize) return
    rendition.resize(container.clientWidth, container.clientHeight)
  }, [])

  useEffect(() => {
    if (!epubBlob || !containerRef.current || !bookId) return

    const generation = ++initGenerationRef.current
    let destroyed = false
    let resizeObserver: ResizeObserver | null = null

    setReady(false)
    setLoadError(null)
    setLoadingProgress(8)

    const init = async () => {
      try {
        setLoadingProgress(18)
        const arrayBuffer = await epubBlob.arrayBuffer()
        if (destroyed || generation !== initGenerationRef.current) return

        setLoadingProgress(32)
        const book = ePub(arrayBuffer)
        bookRef.current = book
        await book.ready
        if (destroyed || generation !== initGenerationRef.current) return

        setLoadingProgress(48)
        if (book.locations.length() === 0) {
          await book.locations.generate(1600)
        }
        if (destroyed || generation !== initGenerationRef.current) return

        setLoadingProgress(62)
        tocRef.current = await loadToc(book as unknown as EpubBookRef)
        if (destroyed || generation !== initGenerationRef.current) return

        const container = containerRef.current!
        setLoadingProgress(72)
        const rendition = book.renderTo(container, {
          width: '100%',
          height: '100%',
          flow: 'scrolled',
          manager: 'continuous',
        })
        renditionRef.current = rendition

        const saved = await db.progress.get(bookId)
        setLoadingProgress(82)
        if (saved?.cfi) {
          await rendition.display(saved.cfi)
          setPercentage(saved.percentage)
          setCurrentCfi(saved.cfi)
        } else {
          await rendition.display()
        }
        if (destroyed || generation !== initGenerationRef.current) return

        setLoadingProgress(90)
        await waitForFirstRender(rendition)
        if (destroyed || generation !== initGenerationRef.current) return

        rendition.on('relocated', (data: unknown) => {
          const location = data as {
            start: { cfi: string; percentage: number; href?: string }
          }
          const cfi = location.start.cfi
          const pct = location.start.percentage * 100
          setCurrentCfi(cfi)
          setPercentage(pct)
          updateChapterLabel(location.start.href)
          db.progress.put({
            bookId,
            cfi,
            percentage: pct,
            updatedAt: Date.now(),
          })
          void import('../lib/sync').then(({ scheduleProgressSync }) => scheduleProgressSync(bookId))
        })

        applySettings(rendition)
        resizeRendition()

        resizeObserver = new ResizeObserver(() => resizeRendition())
        resizeObserver.observe(container)

        setLoadingProgress(100)
        setReady(true)
      } catch (err) {
        if (destroyed || generation !== initGenerationRef.current) return
        console.error('Reader init failed', err)
        setLoadError(err instanceof Error ? err.message : 'Failed to open book')
        setLoadingProgress(0)
        setReady(false)
      }
    }

    void init()

    return () => {
      destroyed = true
      resizeObserver?.disconnect()
      renditionRef.current?.destroy()
      bookRef.current?.destroy()
      renditionRef.current = null
      bookRef.current = null
      setReady(false)
      setLoadingProgress(0)
    }
  }, [epubBlob, bookId, retryCount, updateChapterLabel, applySettings, resizeRendition])

  useEffect(() => {
    if (renditionRef.current && ready) {
      applySettings(renditionRef.current)
      resizeRendition()
    }
  }, [settings, ready, applySettings, resizeRendition])

  const goToPercentage = async (pct: number) => {
    const book = bookRef.current
    const rendition = renditionRef.current
    if (!book || !rendition) return
    const cfi = book.locations.cfiFromPercentage(pct / 100)
    if (cfi) await rendition.display(cfi)
  }

  const goToCfi = async (cfi: string) => {
    const rendition = renditionRef.current
    if (!rendition) return
    await rendition.display(cfi)
  }

  const goToHref = async (href: string) => {
    const rendition = renditionRef.current
    if (!rendition) return
    await rendition.display(href)
  }

  const getToc = useCallback(async (): Promise<TocEntry[]> => {
    if (tocRef.current.length > 0) return tocRef.current
    const book = bookRef.current
    if (!book) return []
    tocRef.current = await loadToc(book as unknown as EpubBookRef)
    return tocRef.current
  }, [])

  const search = useCallback(async (query: string): Promise<SearchHit[]> => {
    const book = bookRef.current
    if (!book) return []
    return searchEpub(book as unknown as EpubBookRef, query)
  }, [])

  const getRendition = useCallback(() => renditionRef.current, [])

  const retry = useCallback(() => {
    setLoadError(null)
    setReady(false)
    setLoadingProgress(0)
    setRetryCount((count) => count + 1)
  }, [])

  return {
    containerRef,
    ready,
    loadingProgress,
    loadError,
    retry,
    percentage,
    currentCfi,
    chapterLabel,
    goToPercentage,
    goToCfi,
    goToHref,
    getToc,
    search,
    getRendition,
  }
}
