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

export function useReader(
  epubBlob: Blob | undefined,
  bookId: number | undefined,
  settings: ReaderSettings,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<ReturnType<typeof ePub> | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const tocRef = useRef<TocEntry[]>([])
  const [ready, setReady] = useState(false)
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

      const container = containerRef.current
      if (container) {
        container.style.paddingLeft = ''
        container.style.paddingRight = ''
      }
    },
    [settings.fontSize, settings.fontFamily, settings.lineSpacing, settings.theme, applyTheme],
  )

  useEffect(() => {
    if (!epubBlob || !containerRef.current || !bookId) return

    let destroyed = false
    setReady(false)

    const init = async () => {
      const arrayBuffer = await epubBlob.arrayBuffer()
      const book = ePub(arrayBuffer)
      bookRef.current = book
      await book.ready
      if (book.locations.length() === 0) {
        await book.locations.generate(1600)
      }

      tocRef.current = await loadToc(book as unknown as EpubBookRef)

      const rendition = book.renderTo(containerRef.current!, {
        width: '100%',
        height: '100%',
        flow: 'scrolled',
        manager: 'continuous',
      })
      renditionRef.current = rendition

      const saved = await db.progress.get(bookId)
      if (saved?.cfi) {
        await rendition.display(saved.cfi)
        setPercentage(saved.percentage)
        setCurrentCfi(saved.cfi)
      } else {
        await rendition.display()
      }

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

      if (!destroyed) setReady(true)
    }

    init()

    return () => {
      destroyed = true
      renditionRef.current?.destroy()
      bookRef.current?.destroy()
      renditionRef.current = null
      bookRef.current = null
      setReady(false)
    }
  }, [epubBlob, bookId, updateChapterLabel])

  useEffect(() => {
    if (renditionRef.current && ready) {
      applySettings(renditionRef.current)
    }
  }, [settings, ready, applySettings])

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

  return {
    containerRef,
    ready,
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
