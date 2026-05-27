import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TopBar } from '../components/Layout/TopBar'
import { InstallPrompt } from '../components/Layout/InstallPrompt'
import { CoverGrid } from '../components/Library/CoverGrid'
import { BookContextMenu } from '../components/Library/BookContextMenu'
import { ConfirmDialog } from '../components/Library/ConfirmDialog'
import { LibrarySubHeader } from '../components/Library/LibrarySubHeader'
import { ShelfOverview } from '../components/Library/ShelfOverview'
import { useBooks } from '../hooks/useBooks'
import { useSettings } from '../hooks/useSettings'
import { PLACEHOLDER_REFRESH_KEY, PLACEHOLDER_SEED_KEY, refreshPlaceholderBooks, seedPlaceholderBooks } from '../lib/placeholderBooks'
import { enrichImportedBook } from '../lib/importBook'
import type { Book, LibrarySort, LibraryView } from '../types'

export function LibraryPage() {
  const navigate = useNavigate()
  const { settings, save } = useSettings()
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importNotice, setImportNotice] = useState<string | null>(null)

  const sort = settings?.librarySort ?? 'recent'
  const rawView = settings?.libraryView ?? 'grid'
  const view = rawView === 'coverflow' ? 'shelf' : rawView
  const { books, importBook, deleteBook, touchBook } = useBooks(sort)
  const [focusedBook, setFocusedBook] = useState<Book | null>(null)
  const [bookMenu, setBookMenu] = useState<{ book: Book; x: number; y: number } | null>(null)
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)

  const handleFocusedBookChange = useCallback((book: Book | null) => {
    setFocusedBook(book)
  }, [])

  useEffect(() => {
    if (view !== 'shelf') setFocusedBook(null)
  }, [view])

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
    const refreshKey = 'libro-epub-covers-v2'
    if (sessionStorage.getItem(refreshKey) || books.length === 0) return
    sessionStorage.setItem(refreshKey, '1')
    books
      .filter((book) => book.coverSource !== 'placeholder' && book.id != null)
      .forEach((book) => {
        void enrichImportedBook(book.id!)
      })
  }, [books])

  const handleImport = async (files: FileList) => {
    setImporting(true)
    setImportError(null)
    setImportNotice(null)
    const importedTitles: string[] = []
    try {
      for (const file of Array.from(files)) {
        await importBook(file)
        importedTitles.push(file.name.replace(/\.epub$/i, ''))
      }
      if (importedTitles.length > 0) {
        setImportNotice(
          importedTitles.length === 1
            ? `Added “${importedTitles[0]}” to your library`
            : `Added ${importedTitles.length} books to your library`,
        )
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

  const openBookMenu = useCallback((book: Book, point: { x: number; y: number }) => {
    setBookMenu({ book, x: point.x, y: point.y })
  }, [])

  const requestRemoveBook = useCallback(() => {
    if (!bookMenu) return
    setBookToDelete(bookMenu.book)
    setBookMenu(null)
  }, [bookMenu])

  const confirmRemoveBook = useCallback(async () => {
    if (bookToDelete?.id) await deleteBook(bookToDelete.id)
    setBookToDelete(null)
  }, [bookToDelete, deleteBook])

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

      {importNotice && !importError && (
        <div className="bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-700">
          {importNotice}
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        <LibrarySubHeader
          sort={sort}
          onSortChange={(s: LibrarySort) => save({ librarySort: s })}
        >
          {view === 'shelf' ? (
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
                <h2 className="text-lg font-semibold">Your shelf</h2>
                <p className="text-sm text-libro-muted">
                  Click a spine to center it and show its cover
                </p>
              </div>
            )
          ) : (
            <div>
              <h2 className="text-lg font-semibold">Your library</h2>
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
            <CoverGrid books={books} onOpen={handleOpen} onBookMenu={openBookMenu} />
          )}
          {view === 'shelf' && (
            <ShelfOverview
              books={books}
              onOpen={handleOpen}
              onFocusedBookChange={handleFocusedBookChange}
              onBookMenu={openBookMenu}
            />
          )}
        </div>
      </main>

      {bookMenu && (
        <BookContextMenu
          book={bookMenu.book}
          x={bookMenu.x}
          y={bookMenu.y}
          onRemove={requestRemoveBook}
          onClose={() => setBookMenu(null)}
        />
      )}

      <ConfirmDialog
        open={bookToDelete != null}
        title="Remove from library?"
        message={
          bookToDelete
            ? `"${bookToDelete.title}" will be removed from your library. This cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={() => void confirmRemoveBook()}
        onCancel={() => setBookToDelete(null)}
      />
    </>
  )
}
