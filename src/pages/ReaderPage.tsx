import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ContentsPanel } from '../components/Reader/ContentsPanel'
import { EpubViewer, type ReaderTapEvent } from '../components/Reader/EpubViewer'
import { ReaderBottomBar } from '../components/Reader/ReaderBottomBar'
import { ReaderLoadingOverlay } from '../components/Reader/ReaderLoadingOverlay'
import { ReaderSettingsPanel } from '../components/Reader/SettingsPanel'
import { ReaderTopBar } from '../components/Reader/ReaderTopBar'
import { SearchPanel } from '../components/Reader/SearchPanel'
import { TranslationPopup } from '../components/Translation/TranslationPopup'
import { useBookmarks } from '../hooks/useBookmarks'
import { useBook } from '../hooks/useBooks'
import { useDailyReadingTime } from '../hooks/useDailyReadingTime'
import { useReader } from '../hooks/useReader'
import { useSettings } from '../hooks/useSettings'
import { useTranslate } from '../hooks/useTranslate'
import type { ReaderTheme, TocEntry } from '../types'
import type { ReaderSettings } from '../hooks/useReader'

type ReaderPanel = 'none' | 'settings' | 'menu' | 'search'

export function ReaderPage() {
  const { id } = useParams<{ id: string }>()
  const bookId = id ? parseInt(id, 10) : undefined
  const book = useBook(bookId)
  const { settings, save } = useSettings()
  const { translate, saveVocab, loading: translating, error: translateError } = useTranslate()
  const { bookmarks, toggleBookmark, removeBookmark, isBookmarked } = useBookmarks(bookId)

  const [panel, setPanel] = useState<ReaderPanel>('none')
  const [chromeVisible, setChromeVisible] = useState(true)
  const chromeVisibleRef = useRef(chromeVisible)
  chromeVisibleRef.current = chromeVisible
  const [tap, setTap] = useState<ReaderTapEvent | null>(null)
  const [translation, setTranslation] = useState<string | null>(null)
  const [contextMode, setContextMode] = useState(false)
  const [toc, setToc] = useState<TocEntry[]>([])

  const persistedReaderSettings = useMemo<ReaderSettings>(
    () => ({
      fontSize: settings?.readerFontSize ?? 100,
      fontFamily: settings?.readerFontFamily ?? 'original',
      theme: settings?.readerTheme ?? 'light',
      lineSpacing: settings?.readerLineSpacing ?? 1.5,
    }),
    [
      settings?.readerFontSize,
      settings?.readerFontFamily,
      settings?.readerTheme,
      settings?.readerLineSpacing,
    ],
  )

  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(persistedReaderSettings)

  useEffect(() => {
    setReaderSettings(persistedReaderSettings)
  }, [persistedReaderSettings])

  const [translationEnabled, setTranslationEnabled] = useState(
    () => settings?.readerTranslationEnabled ?? true,
  )

  useEffect(() => {
    if (settings?.readerTranslationEnabled !== undefined) {
      setTranslationEnabled(settings.readerTranslationEnabled)
    }
  }, [settings?.readerTranslationEnabled])

  const {
    containerRef,
    ready,
    loadingProgress,
    loadError,
    retry,
    percentage,
    currentCfi,
    chapterLabel,
    goToCfi,
    goToHref,
    getToc,
    search,
    getRendition,
  } = useReader(book?.epubBlob, bookId, readerSettings)

  const { formatted: readingTimeLabel } = useDailyReadingTime(ready)

  const anyPanelOpen = panel !== 'none'
  const showChrome = chromeVisible || anyPanelOpen || !!tap

  useEffect(() => {
    if (!ready) return
    void getToc().then(setToc)
  }, [ready, getToc])

  useEffect(() => {
    if (!showChrome || anyPanelOpen || tap) return
    const timer = window.setTimeout(() => setChromeVisible(false), 3500)
    return () => window.clearTimeout(timer)
  }, [showChrome, anyPanelOpen, tap, percentage])

  const openPanel = (next: ReaderPanel) => {
    setPanel(next)
    setChromeVisible(true)
    if (next === 'menu' && toc.length === 0) {
      void getToc().then(setToc)
    }
  }

  const closePanel = () => setPanel('none')

  const handleReaderTap = useCallback(
    (event: ReaderTapEvent) => {
      if (panel !== 'none') return

      if (!chromeVisibleRef.current) {
        setChromeVisible(true)
        setTap(null)
        return
      }

      if (!event.word || !translationEnabled) {
        setChromeVisible(false)
        setTap(null)
        return
      }

      setTap(event)
      setContextMode(false)
      setTranslation(null)
      setChromeVisible(false)
      translate(event.word)
        .then(setTranslation)
        .catch(() => {
          // error surfaced via translateError in hook
        })
    },
    [panel, translate, translationEnabled],
  )

  const handleToggleTranslation = () => {
    const next = !translationEnabled
    setTranslationEnabled(next)
    if (!next) {
      setTap(null)
      setTranslation(null)
      setContextMode(false)
    }
    void save({ readerTranslationEnabled: next })
    setChromeVisible(true)
  }

  const handleBookmarkToggle = async () => {
    if (!currentCfi) return
    const label = chapterLabel || book?.title || 'Bookmark'
    await toggleBookmark(currentCfi, label, percentage)
  }

  const handleMoreContext = async () => {
    if (!tap) return
    setContextMode(true)
    try {
      const snippet = tap.sentence.slice(0, 300)
      const result = await translate(snippet)
      setTranslation(result)
    } catch {
      // error handled by hook
    }
  }

  const handleSave = async () => {
    if (!tap?.word || !translation || !bookId) return
    await saveVocab(bookId, tap.word, translation, contextMode ? tap.sentence : undefined)
    setTap(null)
  }

  const saveReaderSettings = (partial: {
    fontSize?: number
    fontFamily?: string
    theme?: ReaderTheme
    lineSpacing?: number
  }) => {
    setReaderSettings((current) => ({ ...current, ...partial }))

    const updates: Record<string, unknown> = {}
    if (partial.fontSize !== undefined) updates.readerFontSize = partial.fontSize
    if (partial.fontFamily !== undefined) updates.readerFontFamily = partial.fontFamily
    if (partial.theme !== undefined) updates.readerTheme = partial.theme
    if (partial.lineSpacing !== undefined) updates.readerLineSpacing = partial.lineSpacing
    void save(updates)
  }

  if (!book) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-libro-bg">
        <ReaderLoadingOverlay progress={5} label="Loading book…" />
      </div>
    )
  }

  if (!book.epubBlob) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-libro-bg px-6 text-center">
        <p className="text-sm text-red-600">This book file is missing from your library.</p>
        <Link to="/" className="text-sm font-medium text-libro-accent underline">
          Back to library
        </Link>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-libro-bg px-6 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={retry}
            className="rounded-lg bg-libro-accent px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
          <Link to="/" className="rounded-lg border border-libro-border px-4 py-2 text-sm font-medium">
            Back to library
          </Link>
        </div>
      </div>
    )
  }

  const themeClass = `reader-${readerSettings.theme}`
  const bookmarked = currentCfi ? isBookmarked(currentCfi) : false

  return (
    <div
      className={`fixed inset-0 overflow-hidden ${themeClass}`}
      data-reader-theme={readerSettings.theme}
    >
      <div className="absolute inset-0 z-0">
        <EpubViewer
          containerRef={containerRef}
          ready={ready}
          translationEnabled={translationEnabled}
          onTap={handleReaderTap}
          getRendition={getRendition}
        />
      </div>

      {!ready && <ReaderLoadingOverlay progress={loadingProgress} />}

      <ReaderTopBar
        visible={showChrome && panel !== 'search'}
        title={book.title}
        author={book.author}
        chapterLabel={chapterLabel}
      />

      <div
        className={`pointer-events-auto absolute inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          showChrome && panel !== 'search' ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        data-reader-theme={readerSettings.theme}
      >
        <ReaderBottomBar
          chromeVisible={showChrome && panel !== 'search'}
          readingTimeLabel={readingTimeLabel}
          progressPercent={percentage}
          translationEnabled={translationEnabled}
          bookmarked={bookmarked}
          onContents={() => openPanel('menu')}
          onSearch={() => openPanel('search')}
          onSettings={() => openPanel('settings')}
          onBookmark={() => void handleBookmarkToggle()}
          onToggleTranslation={handleToggleTranslation}
        />
      </div>

      <ReaderSettingsPanel
        open={panel === 'settings'}
        onClose={closePanel}
        fontSize={readerSettings.fontSize}
        fontFamily={readerSettings.fontFamily}
        readerTheme={readerSettings.theme}
        lineSpacing={readerSettings.lineSpacing}
        onChange={saveReaderSettings}
      />

      <ContentsPanel
        open={panel === 'menu'}
        bookTitle={book.title}
        items={toc}
        bookmarks={bookmarks}
        onClose={closePanel}
        onSelectHref={(href) => {
          void goToHref(href)
          closePanel()
        }}
        onSelectCfi={(cfi) => {
          void goToCfi(cfi)
          closePanel()
        }}
        onRemoveBookmark={(bookmarkId) => void removeBookmark(bookmarkId)}
      />

      <SearchPanel
        open={panel === 'search'}
        theme={readerSettings.theme}
        onClose={closePanel}
        onSearch={search}
        onSelect={(cfi) => void goToCfi(cfi)}
      />

      {tap?.word && translationEnabled && (
        <TranslationPopup
          word={contextMode ? 'Context' : tap.word}
          translation={translation}
          loading={translating}
          error={translateError}
          x={tap.x}
          y={tap.y}
          onDismiss={() => setTap(null)}
          onMoreContext={handleMoreContext}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
