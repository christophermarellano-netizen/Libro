import { isSupabaseConfigured, requireSupabase } from '../supabase/client'
import { pullBookmarks, pushBookmarks, pullVocab, pushVocab } from './bookmarks'
import { pullBooks, pushAllBooks, uploadBook, deleteCloudBook } from './books'
import { pullProgress, pushAllProgress, pushProgress } from './progress'
import { pullSettings, pushSettings } from './settings'

const LAST_SYNC_KEY = 'libro:lastSyncedAt'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncState {
  status: SyncStatus
  lastSyncedAt: number | null
  error: string | null
}

const listeners = new Set<(state: SyncState) => void>()

let state: SyncState = {
  status: 'idle',
  lastSyncedAt: readLastSyncedAt(),
  error: null,
}

const pendingBookUploads = new Set<number>()
const pendingProgress = new Set<number>()
const pendingBookDeletes = new Set<string>()
let settingsDirty = false
let bookmarksDirty = false
let vocabDirty = false
let flushTimer: ReturnType<typeof setTimeout> | null = null
let fullSyncInFlight: Promise<void> | null = null

function readLastSyncedAt(): number | null {
  const raw = localStorage.getItem(LAST_SYNC_KEY)
  return raw ? Number(raw) : null
}

function writeLastSyncedAt(ts: number) {
  localStorage.setItem(LAST_SYNC_KEY, String(ts))
}

function emit() {
  for (const listener of listeners) {
    listener(state)
  }
}

function setState(partial: Partial<SyncState>) {
  state = { ...state, ...partial }
  emit()
}

export function getSyncState(): SyncState {
  return state
}

export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await requireSupabase().auth.getSession()
  return data.session?.user.id ?? null
}

function scheduleFlush(delayMs = 1500) {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushPending()
  }, delayMs)
}

export function scheduleBookUpload(localId: number) {
  pendingBookUploads.add(localId)
  scheduleFlush()
}

export function scheduleProgressSync(localBookId: number) {
  pendingProgress.add(localBookId)
  scheduleFlush(800)
}

export function scheduleSettingsSync() {
  settingsDirty = true
  scheduleFlush()
}

export function scheduleBookmarksSync() {
  bookmarksDirty = true
  scheduleFlush()
}

export function scheduleVocabSync() {
  vocabDirty = true
  scheduleFlush()
}

export function scheduleBookDelete(cloudId: string) {
  pendingBookDeletes.add(cloudId)
  scheduleFlush()
}

async function flushPending(): Promise<void> {
  const userId = await getUserId()
  if (!userId || !navigator.onLine) {
    if (!navigator.onLine) setState({ status: 'offline' })
    return
  }

  if (state.status === 'syncing') {
    scheduleFlush(2000)
    return
  }

  const hasWork =
    pendingBookUploads.size > 0 ||
    pendingProgress.size > 0 ||
    pendingBookDeletes.size > 0 ||
    settingsDirty ||
    bookmarksDirty ||
    vocabDirty

  if (!hasWork) return

  setState({ status: 'syncing', error: null })

  try {
    for (const cloudId of pendingBookDeletes) {
      await deleteCloudBook(cloudId, userId)
      pendingBookDeletes.delete(cloudId)
    }

    for (const localId of pendingBookUploads) {
      await uploadBook(localId, userId)
      pendingBookUploads.delete(localId)
    }

    for (const bookId of pendingProgress) {
      await pushProgress(bookId, userId)
      pendingProgress.delete(bookId)
    }

    if (settingsDirty) {
      await pushSettings(userId)
      settingsDirty = false
    }

    if (bookmarksDirty) {
      await pushBookmarks(userId)
      bookmarksDirty = false
    }

    if (vocabDirty) {
      await pushVocab(userId)
      vocabDirty = false
    }

    const now = Date.now()
    writeLastSyncedAt(now)
    setState({ status: 'idle', lastSyncedAt: now, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    setState({ status: 'error', error: message })
    scheduleFlush(5000)
  }
}

export async function syncOnLogin(): Promise<void> {
  if (!isSupabaseConfigured) return
  if (fullSyncInFlight) return fullSyncInFlight

  fullSyncInFlight = (async () => {
    const userId = await getUserId()
    if (!userId) return

    setState({ status: 'syncing', error: null })

    try {
      await pullSettings(userId)
      await pullBooks(userId)
      await pullProgress(userId)
      await pullBookmarks(userId)
      await pullVocab(userId)

      await pushAllBooks(userId)
      await pushAllProgress(userId)
      await pushSettings(userId)
      await pushBookmarks(userId)
      await pushVocab(userId)

      const now = Date.now()
      writeLastSyncedAt(now)
      setState({ status: 'idle', lastSyncedAt: now, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      setState({ status: 'error', error: message })
      throw err
    } finally {
      fullSyncInFlight = null
    }
  })()

  return fullSyncInFlight
}

export async function pullLightweight(): Promise<void> {
  const userId = await getUserId()
  if (!userId || !navigator.onLine) return

  try {
    await pullSettings(userId)
    await pullProgress(userId)
    const now = Date.now()
    writeLastSyncedAt(now)
    setState({ status: 'idle', lastSyncedAt: now, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    setState({ status: 'error', error: message })
  }
}

export function initSync(): void {
  if (!isSupabaseConfigured) return

  const client = requireSupabase()

  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      void syncOnLogin()
    }
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void pullLightweight()
    }
  })

  window.addEventListener('online', () => {
    setState({ status: 'idle', error: null })
    void flushPending()
  })

  void getUserId().then((userId) => {
    if (userId) void syncOnLogin()
  })
}

export { isSupabaseConfigured }
