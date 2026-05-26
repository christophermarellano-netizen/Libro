import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/Layout/TopBar'
import { InstallPrompt } from '../components/Layout/InstallPrompt'
import { CoverGrid } from '../components/Library/CoverGrid'
import { CoverFlowCarousel } from '../components/Library/CoverFlowCarousel'
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
        sort={sort}
        onViewChange={(v: LibraryView) => save({ libraryView: v })}
        onSortChange={(s: LibrarySort) => save({ librarySort: s })}
        onImport={handleImport}
        importing={importing}
      />

      {importError && (
        <div className="bg-red-50 px-4 py-2 text-center text-sm text-red-600">
          {importError}
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-auto">
        {view === 'grid' && (
          <CoverGrid books={books} onOpen={handleOpen} onDelete={handleDelete} />
        )}
        {view === 'coverflow' && (
          <CoverFlowCarousel books={books} onOpen={handleOpen} />
        )}
        {view === 'shelf' && (
          <ShelfOverview books={books} onOpen={handleOpen} />
        )}
      </main>
    </>
  )
}
