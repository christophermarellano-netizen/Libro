import { db } from '../../db'
import { requireSupabase } from '../supabase/client'
import { progressToCloudRow, type CloudProgress } from './types'

async function localIdToCloudId(localBookId: number): Promise<string | null> {
  const book = await db.books.get(localBookId)
  return book?.cloudId ?? null
}

export async function pushProgress(localBookId: number, userId: string): Promise<void> {
  const progress = await db.progress.get(localBookId)
  if (!progress) return

  const cloudBookId = await localIdToCloudId(localBookId)
  if (!cloudBookId) return

  const client = requireSupabase()
  const row = progressToCloudRow(progress, cloudBookId, userId)
  const { error } = await client.from('reading_progress').upsert(row)
  if (error) throw error
}

export async function pullProgress(userId: string): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  if (!data?.length) return

  for (const row of data as CloudProgress[]) {
    const book = await db.books.where('cloudId').equals(row.book_id).first()
    if (!book?.id) continue

    const local = await db.progress.get(book.id)
    if (!local || row.updated_at > local.updatedAt) {
      await db.progress.put({
        bookId: book.id,
        cfi: row.cfi,
        percentage: row.percentage,
        updatedAt: row.updated_at,
      })
    } else if (local.updatedAt > row.updated_at) {
      await pushProgress(book.id, userId)
    }
  }
}

export async function pushAllProgress(userId: string): Promise<void> {
  const all = await db.progress.toArray()
  for (const entry of all) {
    await pushProgress(entry.bookId, userId)
  }
}
