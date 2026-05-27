import { db } from '../../db'
import { requireSupabase } from '../supabase/client'
import {
  bookToCloudRow,
  cloudRowToBookMeta,
  type CloudBook,
} from './types'

function newCloudId(): string {
  return crypto.randomUUID()
}

async function uploadBookFiles(
  userId: string,
  cloudId: string,
  epubBlob: Blob,
  coverBlob: Blob,
): Promise<void> {
  const client = requireSupabase()
  const epubPath = `${userId}/${cloudId}/book.epub`
  const coverPath = `${userId}/${cloudId}/cover`

  const { error: epubError } = await client.storage.from('epubs').upload(epubPath, epubBlob, {
    upsert: true,
    contentType: 'application/epub+zip',
  })
  if (epubError) throw epubError

  const { error: coverError } = await client.storage.from('epubs').upload(coverPath, coverBlob, {
    upsert: true,
    contentType: coverBlob.type || 'image/jpeg',
  })
  if (coverError) throw coverError
}

async function downloadBookFiles(row: CloudBook): Promise<{ epubBlob: Blob; coverBlob: Blob }> {
  const client = requireSupabase()
  const [epubRes, coverRes] = await Promise.all([
    client.storage.from('epubs').download(row.storage_path),
    client.storage.from('epubs').download(row.cover_path),
  ])
  if (epubRes.error) throw epubRes.error
  if (coverRes.error) throw coverRes.error
  return { epubBlob: epubRes.data, coverBlob: coverRes.data }
}

export async function uploadBook(localId: number, userId: string): Promise<string | null> {
  const book = await db.books.get(localId)
  if (!book) return null

  const cloudId = book.cloudId ?? newCloudId()
  const now = Date.now()
  await db.books.update(localId, { cloudId, syncUpdatedAt: now })

  await uploadBookFiles(userId, cloudId, book.epubBlob, book.coverBlob)

  const updatedBook = { ...book, cloudId, syncUpdatedAt: now, id: localId }
  const row = bookToCloudRow(updatedBook, userId, cloudId)

  const client = requireSupabase()
  const { error } = await client.from('books').upsert(row)
  if (error) throw error

  return cloudId
}

export async function downloadBook(row: CloudBook): Promise<number> {
  const existing = await db.books.where('cloudId').equals(row.id).first()
  const { epubBlob, coverBlob } = await downloadBookFiles(row)
  const meta = cloudRowToBookMeta(row)

  if (existing?.id) {
    await db.books.update(existing.id, { ...meta, epubBlob, coverBlob })
    return existing.id
  }

  return (await db.books.add({
    ...meta,
    epubBlob,
    coverBlob,
  })) as number
}

export async function deleteCloudBook(cloudId: string, userId: string): Promise<void> {
  const client = requireSupabase()
  const prefix = `${userId}/${cloudId}`

  await client.storage.from('epubs').remove([`${prefix}/book.epub`, `${prefix}/cover`])
  await client.from('books').delete().eq('id', cloudId).eq('user_id', userId)
}

export async function pullBooks(userId: string): Promise<void> {
  const client = requireSupabase()
  const { data: cloudBooks, error } = await client
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })

  if (error) throw error
  if (!cloudBooks?.length) return

  for (const row of cloudBooks as CloudBook[]) {
    const local = await db.books.where('cloudId').equals(row.id).first()
    if (!local) {
      await downloadBook(row)
      continue
    }

    const localUpdated = local.syncUpdatedAt ?? local.addedAt
    if (row.updated_at > localUpdated) {
      const { epubBlob, coverBlob } = await downloadBookFiles(row)
      await db.books.update(local.id!, { ...cloudRowToBookMeta(row), epubBlob, coverBlob })
    } else if (localUpdated > row.updated_at) {
      await uploadBook(local.id!, userId)
    }
  }
}

export async function pushAllBooks(userId: string): Promise<void> {
  const books = await db.books.toArray()
  for (const book of books) {
    if (!book.id) continue
    await uploadBook(book.id, userId)
  }
}
