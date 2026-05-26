import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ContentsPanel } from '../components/Reader/ContentsPanel'
import { EpubViewer, type WordTapEvent } from '../components/Reader/EpubViewer'
import { PageControls } from '../components/Reader/PageControls'
import { ReaderSettingsPanel } from '../components/Reader/SettingsPanel'
import { ReaderTopBar } from '../components/Reader/ReaderTopBar'
import { SearchPanel } from '../components/Reader/SearchPanel'
import { TranslationPopup } from '../components/Translation/TranslationPopup'
import { useBookmarks } from '../hooks/useBookmarks'
import { useBook } from '../hooks/useBooks'
import { useReader } from '../hooks/useReader'
import { useSettings } from '../hooks/useSettings'
import { useTranslate } from '../hooks/useTranslate'
import type { ReaderTheme, TocEntry } from '../types'

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
  const [tap, setTap] = useState<WordTapEvent | null>(null)
  const [translation, setTranslation] = useState<string | null>(null)
  const [contextMode, setContextMode] = useState(false)
  const [toc, setToc] = useState<TocEntry[]>([])

  const readerSettings = {
    fontSize: settings?.readerFontSize ?? 100,
    fontFamily: settings?.readerFontFamily ?? 'Georgia, serif',
    theme: settings?.readerTheme ?? 'light',
    lineSpacing: settings?.readerLineSpacing ?? 1.5,
    margin: settings?.readerMargin ?? 16,
  }

  const {
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
  } = useReader(book?.epubBlob, bookId, readerSettings)

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

  const handleBackgroundTap = useCallback(() => {
    if (panel !== 'none') return
    setChromeVisible((v) => !v)
  }, [panel])

  const handleWordTap = useCallback(
    (event: WordTapEvent) => {
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
    [translate],
  )

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
    if (!tap || !translation || !bookId) return
    await saveVocab(bookId, tap.word, translation, contextMode ? tap.sentence : undefined)
    setTap(null)
  }

  const saveReaderSettings = (partial: {
    fontSize?: number
    fontFamily?: string
    theme?: ReaderTheme
    lineSpacing?: number
    margin?: number
  }) => {
    const updates: Record<string, unknown> = {}
    if (partial.fontSize !== undefined) updates.readerFontSize = partial.fontSize
    if (partial.fontFamily !== undefined) updates.readerFontFamily = partial.fontFamily
    if (partial.theme !== undefined) updates.readerTheme = partial.theme
    if (partial.lineSpacing !== undefined) updates.readerLineSpacing = partial.lineSpacing
    if (partial.margin !== undefined) updates.readerMargin = partial.margin
    save(updates)
  }

  if (!book) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-libro-muted">Loading book…</p>
      </div>
    )
  }

  const themeClass = `reader-${readerSettings.theme}`
  const bookmarked = currentCfi ? isBookmarked(currentCfi) : false

  return (
    <div className={`relative h-full overflow-hidden ${themeClass}`} data-reader-theme={readerSettings.theme}>
      <div className="absolute inset-0 z-0">
        <EpubViewer
          containerRef={containerRef}
          ready={ready}
          onWordTap={handleWordTap}
          onBackgroundTap={handleBackgroundTap}
          getRendition={getRendition}
        />
      </div>

      <ReaderTopBar
        visible={showChrome && panel !== 'search'}
        theme={readerSettings.theme}
        title={book.title}
        chapterLabel={chapterLabel}
        bookmarked={bookmarked}
        onSearch={() => openPanel('search')}
        onContents={() => openPanel('menu')}
        onBookmark={handleBookmarkToggle}
        onSettings={() => openPanel('settings')}
      />

      <div
        className={`reader-chrome-bottom pointer-events-auto absolute inset-x-0 bottom-0 z-50 backdrop-blur-xl transition-transform duration-300 ease-out ${
          showChrome && panel !== 'search' ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        data-reader-theme={readerSettings.theme}
      >
        <PageControls
          percentage={percentage}
          theme={readerSettings.theme}
          onChange={goToPercentage}
        />
      </div>

      <ReaderSettingsPanel
        open={panel === 'settings'}
        theme={readerSettings.theme}
        onClose={closePanel}
        fontSize={readerSettings.fontSize}
        fontFamily={readerSettings.fontFamily}
        readerTheme={readerSettings.theme}
        lineSpacing={readerSettings.lineSpacing}
        margin={readerSettings.margin}
        onChange={saveReaderSettings}
      />

      <ContentsPanel
        open={panel === 'menu'}
        theme={readerSettings.theme}
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

      {tap && (
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
