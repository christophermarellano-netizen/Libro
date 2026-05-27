import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Bookmark } from '../types'

export function useBookmarks(bookId: number | undefined) {
  const bookmarks = useLiveQuery(
    async () => {
      if (!bookId) return []
      return db.bookmarks.where('bookId').equals(bookId).sortBy('createdAt')
    },
    [bookId],
  )

  const addBookmark = async (cfi: string, label: string, percentage: number) => {
    if (!bookId) return
    const existing = await db.bookmarks
      .where('bookId')
      .equals(bookId)
      .filter((b) => b.cfi === cfi)
      .first()
    if (existing?.id) return existing.id

    const id = await db.bookmarks.add({
      bookId,
      cfi,
      label,
      percentage,
      createdAt: Date.now(),
    })
    const { scheduleBookmarksSync } = await import('../lib/sync')
    scheduleBookmarksSync()
    return id
  }

  const removeBookmark = async (id: number) => {
    await db.bookmarks.delete(id)
    const { scheduleBookmarksSync } = await import('../lib/sync')
    scheduleBookmarksSync()
  }

  const isBookmarked = (cfi: string) =>
    (bookmarks ?? []).some((b) => b.cfi === cfi)

  const toggleBookmark = async (cfi: string, label: string, percentage: number) => {
    const existing = (bookmarks ?? []).find((b) => b.cfi === cfi)
    if (existing?.id) {
      await removeBookmark(existing.id)
      return false
    }
    await addBookmark(cfi, label, percentage)
    return true
  }

  return {
    bookmarks: (bookmarks ?? []) as Bookmark[],
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
  }
}
