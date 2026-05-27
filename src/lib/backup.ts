import JSZip from 'jszip'
import { db, ensureSettings } from '../db'
import type { AppSettings, Book, Bookmark, ReadingProgress, VocabEntry } from '../types'

const BACKUP_VERSION = 1

function stripBookBlobs(book: Book): Omit<Book, 'epubBlob' | 'coverBlob'> {
  const { epubBlob: _epub, coverBlob: _cover, ...meta } = book
  void _epub
  void _cover
  return meta
}

function stripBookmarkId(bookmark: Bookmark): Omit<Bookmark, 'id'> {
  const { id: _id, ...rest } = bookmark
  void _id
  return rest
}

function stripVocabId(entry: VocabEntry): Omit<VocabEntry, 'id'> {
  const { id: _id, ...rest } = entry
  void _id
  return rest
}

interface BackupManifest {
  version: number
  exportedAt: number
  books: Omit<Book, 'epubBlob' | 'coverBlob'>[]
  progress: ReadingProgress[]
  bookmarks: Bookmark[]
  vocab: VocabEntry[]
  settings: Omit<AppSettings, 'id'>
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

export async function exportLibraryBackup(): Promise<Blob> {
  const [books, progress, bookmarks, vocab, settings] = await Promise.all([
    db.books.toArray(),
    db.progress.toArray(),
    db.bookmarks.toArray(),
    db.vocab.toArray(),
    ensureSettings(),
  ])

  const { id: _settingsId, ...settingsWithoutId } = settings
  void _settingsId
  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    books: books.map(stripBookBlobs),
    progress,
    bookmarks,
    vocab,
    settings: settingsWithoutId,
  }

  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  await Promise.all(
    books.map(async (book) => {
      if (!book.id) return
      const prefix = `books/${book.id}`
      zip.file(`${prefix}/book.epub`, await blobToBase64(book.epubBlob), { base64: true })
      zip.file(`${prefix}/cover`, await blobToBase64(book.coverBlob), { base64: true })
    }),
  )

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

export async function downloadLibraryBackup(): Promise<void> {
  const blob = await exportLibraryBackup()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `libro-backup-${new Date().toISOString().slice(0, 10)}.libro`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function importLibraryBackup(file: File): Promise<{ books: number }> {
  const zip = await JSZip.loadAsync(file)
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) {
    throw new Error('Invalid backup: missing manifest.json')
  }

  const manifest = JSON.parse(await manifestFile.async('string')) as BackupManifest
  if (manifest.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${manifest.version}`)
  }

  const idMap = new Map<number, number>()

  for (const meta of manifest.books) {
    const oldId = meta.id
    if (!oldId) continue

    const epubFile = zip.file(`books/${oldId}/book.epub`)
    const coverFile = zip.file(`books/${oldId}/cover`)
    if (!epubFile || !coverFile) continue

    const epubBlob = base64ToBlob(await epubFile.async('base64'), 'application/epub+zip')
    const coverBlob = base64ToBlob(await coverFile.async('base64'), 'image/jpeg')

    const { id: _oldId, ...rest } = meta
    void _oldId
    const newId = (await db.books.add({
      ...rest,
      epubBlob,
      coverBlob,
    } as Book)) as number
    idMap.set(oldId, newId)
  }

  for (const entry of manifest.progress) {
    const newBookId = idMap.get(entry.bookId)
    if (!newBookId) continue
    await db.progress.put({ ...entry, bookId: newBookId })
  }

  for (const entry of manifest.bookmarks) {
    const newBookId = idMap.get(entry.bookId)
    if (!newBookId) continue
    await db.bookmarks.add({ ...stripBookmarkId(entry), bookId: newBookId })
  }

  for (const entry of manifest.vocab) {
    const newBookId = idMap.get(entry.bookId)
    if (!newBookId) continue
    await db.vocab.add({ ...stripVocabId(entry), bookId: newBookId })
  }

  await db.settings.put({ ...manifest.settings, id: 1 })

  return { books: idMap.size }
}
