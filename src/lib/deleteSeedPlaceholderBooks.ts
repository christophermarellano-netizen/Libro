import { db } from '../db'
import type { Book } from '../types'

const SEED_EPUB_MARKER = 'libro de prueba generado para la biblioteca de Libro'

export const SEED_BOOKS_REMOVED_KEY = 'libro-seed-books-removed-v1'

export async function isSeedPlaceholderBook(book: Book): Promise<boolean> {
  if (!book.epubBlob || book.epubBlob.size === 0) return false
  const sample = book.epubBlob.slice(0, Math.min(book.epubBlob.size, 512_000))
  const haystack = new TextDecoder('utf-8').decode(await sample.arrayBuffer())
  return haystack.includes(SEED_EPUB_MARKER)
}

export async function deleteSeedPlaceholderBooks(): Promise<number> {
  const all = await db.books.toArray()
  let deleted = 0

  for (const book of all) {
    if (!book.id || !(await isSeedPlaceholderBook(book))) continue

    await db.books.delete(book.id)
    await db.progress.delete(book.id)
    await db.vocab.where('bookId').equals(book.id).delete()
    await db.bookmarks.where('bookId').equals(book.id).delete()

    if (book.cloudId) {
      const { scheduleBookDelete } = await import('./sync')
      scheduleBookDelete(book.cloudId)
    }

    deleted++
  }

  return deleted
}
