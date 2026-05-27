import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { importEpubFile, enrichImportedBook, refreshBookDimensions } from '../lib/importBook'
import type { Book, LibrarySort } from '../types'

function sortBooks(books: Book[], sort: LibrarySort): Book[] {
  const copy = [...books]
  switch (sort) {
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    case 'author':
      return copy.sort((a, b) => a.author.localeCompare(b.author))
    case 'recent':
    default:
      return copy.sort(
        (a, b) =>
          (b.lastOpenedAt ?? b.addedAt) - (a.lastOpenedAt ?? a.addedAt),
      )
  }
}

export function useBooks(sort: LibrarySort = 'recent') {
  const books = useLiveQuery(async () => {
    const all = await db.books.toArray()
    return sortBooks(all, sort)
  }, [sort])

  const importBook = async (file: File) => {
    const book = await importEpubFile(file)
    const id = (await db.books.add(book as Book)) as number
    void enrichImportedBook(id).catch((error) => {
      console.error('Background metadata enrichment failed', error)
    })
    const { scheduleBookUpload } = await import('../lib/sync')
    scheduleBookUpload(id)
    return id
  }

  const deleteBook = async (id: number) => {
    const book = await db.books.get(id)
    await db.books.delete(id)
    await db.progress.delete(id)
    await db.vocab.where('bookId').equals(id).delete()
    await db.bookmarks.where('bookId').equals(id).delete()
    if (book?.cloudId) {
      const { scheduleBookDelete } = await import('../lib/sync')
      scheduleBookDelete(book.cloudId)
    }
  }

  const touchBook = async (id: number) => {
    const now = Date.now()
    await db.books.update(id, { lastOpenedAt: now, syncUpdatedAt: now })
    const { scheduleBookUpload } = await import('../lib/sync')
    scheduleBookUpload(id)
  }

  const refreshMetadata = async (book: Book) => {
    if (!book.id) return
    const updates = await refreshBookDimensions(book)
    await db.books.update(book.id, updates)
  }

  return {
    books: books ?? [],
    loading: books === undefined,
    importBook,
    deleteBook,
    touchBook,
    refreshMetadata,
  }
}

export function useBook(id: number | undefined) {
  return useLiveQuery(() => (id ? db.books.get(id) : undefined), [id])
}

export function coverUrl(book: Book): string {
  return URL.createObjectURL(book.coverBlob)
}
