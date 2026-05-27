import { useCallback, useEffect, useState } from 'react'
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
import { deleteSeedPlaceholderBooks, SEED_BOOKS_REMOVED_KEY } from '../lib/deleteSeedPlaceholderBooks'
import { enrichImportedBook } from '../lib/importBook'
import type { Book, LibrarySort, LibraryView } from '../types'

export function LibraryPage() {
  const navigate = useNavigate()
  const { settings, save } = useSettings()

  const sort = settings?.librarySort ?? 'recent'
  const rawView = settings?.libraryView ?? 'grid'
  const view = rawView === 'coverflow' ? 'shelf' : rawView
  const { books, deleteBook, touchBook } = useBooks(sort)
  const [focusedBook, setFocusedBook] = useState<Book | null>(null)
  const [bookMenu, setBookMenu] = useState<{ book: Book; x: number; y: number } | null>(null)
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)

  const handleFocusedBookChange = useCallback((book: Book | null) => {
    setFocusedBook(book)
  }, [])

  useEffect(() => {
    if (view !== 'shelf') setFocusedBook(null)
  }, [view])

  useEffect(() => {
    if (localStorage.getItem(SEED_BOOKS_REMOVED_KEY)) return
    void deleteSeedPlaceholderBooks().then(() => {
      localStorage.setItem(SEED_BOOKS_REMOVED_KEY, '1')
      localStorage.removeItem('libro-placeholder-seed-v2')
      sessionStorage.removeItem('libro-placeholder-dims-v2')
    })
  }, [])

  useEffect(() => {
    const refreshKey = 'libro-epub-covers-v2'
    if (sessionStorage.getItem(refreshKey) || books.length === 0) return
    sessionStorage.setItem(refreshKey, '1')
    books
      .filter((book) => book.id != null && book.coverSource !== 'epub')
      .forEach((book) => {
        void enrichImportedBook(book.id!)
      })
  }, [books])

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
      />

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
                  <h2 className="text-lg font-semibold text-sentence-case">{focusedBook.title}</h2>
                  <p className="text-sm text-libro-muted text-sentence-case">{focusedBook.author}</p>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-sentence-case">your shelf</h2>
                <p className="text-sm text-libro-muted text-sentence-case">
                  click a spine to center it and show its cover
                </p>
              </div>
            )
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-sentence-case">your library</h2>
              <p className="text-sm text-libro-muted text-sentence-case">
                {books.length === 0
                  ? 'import a Spanish EPUB to get started'
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
