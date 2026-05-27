import Dexie, { type EntityTable } from 'dexie'
import type { AppSettings, Book, Bookmark, ReadingProgress, VocabEntry } from '../types'
import { DEFAULT_SETTINGS } from '../types'

export class LibroDatabase extends Dexie {
  books!: EntityTable<Book, 'id'>
  progress!: EntityTable<ReadingProgress, 'bookId'>
  vocab!: EntityTable<VocabEntry, 'id'>
  bookmarks!: EntityTable<Bookmark, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('libro')

    this.version(1).stores({
      books: '++id, title, author, addedAt, lastOpenedAt',
      progress: 'bookId',
      vocab: '++id, bookId, word, addedAt',
      settings: 'id',
    })

    this.version(2).stores({
      books: '++id, title, author, addedAt, lastOpenedAt',
      progress: 'bookId',
      vocab: '++id, bookId, word, addedAt',
      bookmarks: '++id, bookId, cfi, createdAt',
      settings: 'id',
    })

    this.version(3).stores({
      books: '++id, cloudId, title, author, addedAt, lastOpenedAt',
      progress: 'bookId',
      vocab: '++id, cloudId, bookId, word, addedAt',
      bookmarks: '++id, cloudId, bookId, cfi, createdAt',
      settings: 'id',
    })
  }
}

export const db = new LibroDatabase()

export async function readSettings(): Promise<AppSettings | undefined> {
  return db.settings.get(1)
}

export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(1)
  if (existing) {
    const merged = { ...DEFAULT_SETTINGS, ...existing, id: 1 }
    if (existing.readerTranslationEnabled === undefined) {
      await db.settings.put(merged)
    }
    return merged
  }
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

export async function getSettings(): Promise<AppSettings> {
  return ensureSettings()
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await ensureSettings()
  const updated = {
    ...current,
    ...partial,
    id: 1,
    syncUpdatedAt: Date.now(),
  }
  await db.settings.put(updated)

  const { scheduleSettingsSync } = await import('../lib/sync')
  scheduleSettingsSync()

  return updated
}
