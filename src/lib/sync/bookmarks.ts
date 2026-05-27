import { db } from '../../db'
import { requireSupabase } from '../supabase/client'
import {
  bookmarkToCloudRow,
  vocabToCloudRow,
  type CloudBookmark,
  type CloudVocab,
} from './types'

async function cloudBookIdForLocal(localBookId: number): Promise<string | null> {
  const book = await db.books.get(localBookId)
  return book?.cloudId ?? null
}

export async function pushBookmarks(userId: string): Promise<void> {
  const bookmarks = await db.bookmarks.toArray()
  const client = requireSupabase()

  for (const bookmark of bookmarks) {
    const cloudBookId = await cloudBookIdForLocal(bookmark.bookId)
    if (!cloudBookId) continue

    const row = bookmarkToCloudRow(bookmark, cloudBookId, userId)
    const { data, error } = await client
      .from('bookmarks')
      .upsert(row, { onConflict: 'book_id,cfi' })
      .select('id')
      .single()

    if (error) throw error
    if (data?.id && bookmark.id && !bookmark.cloudId) {
      await db.bookmarks.update(bookmark.id, { cloudId: data.id })
    }
  }
}

export async function pullBookmarks(userId: string): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client.from('bookmarks').select('*').eq('user_id', userId)
  if (error) throw error
  if (!data?.length) return

  for (const row of data as CloudBookmark[]) {
    const book = await db.books.where('cloudId').equals(row.book_id).first()
    if (!book?.id) continue

    const existing = await db.bookmarks
      .where('bookId')
      .equals(book.id)
      .filter((b) => b.cfi === row.cfi)
      .first()

    if (existing?.id) {
      if (!existing.cloudId) {
        await db.bookmarks.update(existing.id, { cloudId: row.id })
      }
      continue
    }

    await db.bookmarks.add({
      bookId: book.id,
      cfi: row.cfi,
      label: row.label,
      percentage: row.percentage,
      createdAt: row.created_at,
      cloudId: row.id,
    })
  }
}

export async function pushVocab(userId: string): Promise<void> {
  const entries = await db.vocab.toArray()
  const client = requireSupabase()

  for (const entry of entries) {
    const cloudBookId = await cloudBookIdForLocal(entry.bookId)
    const row = vocabToCloudRow(entry, cloudBookId, userId)

    if (entry.cloudId) {
      const { error } = await client.from('vocab').upsert({ ...row, id: entry.cloudId })
      if (error) throw error
      continue
    }

    const { data, error } = await client.from('vocab').insert(row).select('id').single()
    if (error) throw error
    if (data?.id && entry.id) {
      await db.vocab.update(entry.id, { cloudId: data.id })
    }
  }
}

export async function pullVocab(userId: string): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client.from('vocab').select('*').eq('user_id', userId)
  if (error) throw error
  if (!data?.length) return

  for (const row of data as CloudVocab[]) {
    if (!row.book_id) continue
    const book = await db.books.where('cloudId').equals(row.book_id).first()
    if (!book?.id) continue

    const existing = row.id
      ? await db.vocab.where('cloudId').equals(row.id).first()
      : undefined

    if (existing) continue

    await db.vocab.add({
      bookId: book.id,
      word: row.word,
      translation: row.translation,
      context: row.context ?? undefined,
      addedAt: row.added_at,
      cloudId: row.id,
    })
  }
}
