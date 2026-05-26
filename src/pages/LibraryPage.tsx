import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TopBar } from '../components/Layout/TopBar'
import { InstallPrompt } from '../components/Layout/InstallPrompt'
import { CoverGrid } from '../components/Library/CoverGrid'
import { CoverFlowCarousel } from '../components/Library/CoverFlowCarousel'
import { LibrarySubHeader } from '../components/Library/LibrarySubHeader'
import { ShelfOverview } from '../components/Library/ShelfOverview'
import { useBooks } from '../hooks/useBooks'
import { useSettings } from '../hooks/useSettings'
import { PLACEHOLDER_REFRESH_KEY, PLACEHOLDER_SEED_KEY, refreshPlaceholderBooks, seedPlaceholderBooks } from '../lib/placeholderBooks'
import type { Book, LibrarySort, LibraryView } from '../types'

export function LibraryPage() {
  const navigate = useNavigate()
  const { settings, save } = useSettings()
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const sort = settings?.librarySort ?? 'recent'
  const view = settings?.libraryView ?? 'grid'
  const { books, importBook, deleteBook, touchBook, refreshMetadata } = useBooks(sort)
  const [focusedBook, setFocusedBook] = useState<Book | null>(null)

  const handleFocusedBookChange = useCallback((book: Book | null) => {
    setFocusedBook(book)
  }, [])

  const seedStarted = useRef(false)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (seedStarted.current) return
    if (localStorage.getItem(PLACEHOLDER_SEED_KEY)) return
    if (books.length > 0) return
    seedStarted.current = true
    void seedPlaceholderBooks(40).then(() => {
      localStorage.setItem(PLACEHOLDER_SEED_KEY, '1')
    })
  }, [books.length])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (sessionStorage.getItem(PLACEHOLDER_REFRESH_KEY) || books.length === 0) return
    sessionStorage.setItem(PLACEHOLDER_REFRESH_KEY, '1')
    void refreshPlaceholderBooks()
  }, [books.length])

  useEffect(() => {
    const refreshKey = 'libro-dims-english-title-v2'
    if (sessionStorage.getItem(refreshKey) || books.length === 0) return
    sessionStorage.setItem(refreshKey, '1')
    books
      .filter((book) => book.coverSource !== 'placeholder')
      .forEach((book) => {
        void refreshMetadata(book)
      })
  }, [books, refreshMetadata])

  const handleImport = async (files: FileList) => {
    setImporting(true)
    setImportError(null)
    try {
      for (const file of Array.from(files)) {
        await importBook(file)
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleOpen = async (book: Book) => {
    if (book.id) {
      await touchBook(book.id)
      navigate(`/read/${book.id}`)
    }
  }

  const handleDelete = async (book: Book) => {
    if (book.id) await deleteBook(book.id)
  }

  return (
    <>
      <InstallPrompt />
      <TopBar
        view={view}
        onViewChange={(v: LibraryView) => save({ libraryView: v })}
        onImport={handleImport}
        importing={importing}
      />

      {importError && (
        <div className="bg-red-50 px-4 py-2 text-center text-sm text-red-600">
          {importError}
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        <LibrarySubHeader
          sort={sort}
          onSortChange={(s: LibrarySort) => save({ librarySort: s })}
        >
          {view === 'coverflow' ? (
            focusedBook ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={focusedBook.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-lg font-semibold">{focusedBook.title}</h2>
                  <p className="text-sm text-libro-muted">{focusedBook.author}</p>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div>
                <h2 className="text-lg font-semibold">Select a book</h2>
                <p className="text-sm text-libro-muted">
                  Click a spine to center it and show its cover
                </p>
              </div>
            )
          ) : (
            <div>
              <h2 className="text-lg font-semibold">
                {view === 'shelf' ? 'Your shelf' : 'Your library'}
              </h2>
              <p className="text-sm text-libro-muted">
                {books.length === 0
                  ? 'Import a Spanish EPUB to get started'
                  : `${books.length} book${books.length === 1 ? '' : 's'}`}
              </p>
            </div>
          )}
        </LibrarySubHeader>

        <div
          className={`flex min-h-0 flex-1 flex-col ${view === 'grid' ? 'overflow-auto' : 'overflow-hidden'}`}
        >
          {view === 'grid' && (
            <CoverGrid books={books} onOpen={handleOpen} onDelete={handleDelete} />
          )}
          {view === 'coverflow' && (
            <CoverFlowCarousel
              books={books}
              onOpen={handleOpen}
              onFocusedBookChange={handleFocusedBookChange}
            />
          )}
          {view === 'shelf' && (
            <ShelfOverview books={books} onOpen={handleOpen} />
          )}
        </div>
      </main>
    </>
  )
}
