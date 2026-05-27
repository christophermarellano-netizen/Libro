import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { downloadLibraryBackup, importLibraryBackup } from '../lib/backup'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { useSync } from '../hooks/useSync'

function formatSyncTime(ts: number | null): string {
  if (!ts) return 'Never'
  return new Date(ts).toLocaleString()
}

export function SettingsPage() {
  const { settings, save } = useSettings()
  const { user, configured, loading: authLoading, signInWithEmail, signOut } = useAuth()
  const { status, lastSyncedAt, error, syncNow } = useSync()

  const [apiKeyDraft, setApiKeyDraft] = useState<string | null>(null)
  const apiKey = apiKeyDraft ?? settings?.deeplApiKey ?? ''
  const [keySaved, setKeySaved] = useState(false)
  const [email, setEmail] = useState('')
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [backupBusy, setBackupBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistApiKey = useCallback(
    async (value: string) => {
      await save({ deeplApiKey: value.trim() || undefined })
      setKeySaved(true)
      setTimeout(() => setKeySaved(false), 2000)
    },
    [save],
  )

  const handleApiKeyChange = (value: string) => {
    setApiKeyDraft(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void persistApiKey(value)
    }, 600)
  }

  const handleApiKeyBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    void persistApiKey(apiKey)
  }

  const handleSignIn = async () => {
    setAuthError(null)
    setAuthMessage(null)
    try {
      await signInWithEmail(email)
      setAuthMessage('Check your email for a sign-in link.')
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Sign-in failed')
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      await syncNow()
    } catch {
      // error surfaced via useSync
    } finally {
      setSyncing(false)
    }
  }

  const handleExport = async () => {
    setBackupBusy(true)
    setBackupMessage(null)
    try {
      await downloadLibraryBackup()
      setBackupMessage('Backup downloaded.')
    } catch (e) {
      setBackupMessage(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBackupBusy(false)
    }
  }

  const handleImport = async (file: File) => {
    setBackupBusy(true)
    setBackupMessage(null)
    try {
      const result = await importLibraryBackup(file)
      setBackupMessage(`Restored ${result.books} book(s).`)
    } catch (e) {
      setBackupMessage(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBackupBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="relative border-b border-libro-border bg-libro-surface px-4 py-3 text-center">
        <Link
          to="/"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-libro-muted transition hover:text-libro-text"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 space-y-6 p-6">
        {configured && (
          <section className="rounded-xl border border-libro-border bg-libro-surface p-6">
            <h2 className="mb-1 text-base font-semibold">Cloud Sync</h2>
            <p className="mb-4 text-sm text-libro-muted">
              Sign in on your phone and laptop to keep your library, reading progress, and settings
              in sync.
            </p>

            {authLoading ? (
              <p className="text-sm text-libro-muted">Loading…</p>
            ) : user ? (
              <div className="space-y-3">
                <p className="text-sm">
                  Signed in as <span className="font-medium">{user.email}</span>
                </p>
                <p className="text-sm text-libro-muted">
                  Last synced: {formatSyncTime(lastSyncedAt)}
                  {status === 'syncing' || syncing ? ' (syncing…)' : ''}
                  {status === 'offline' ? ' (offline)' : ''}
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={status === 'syncing' || syncing}
                    onClick={() => void handleSyncNow()}
                    className="flex-1 rounded-lg bg-libro-accent px-4 py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
                  >
                    Sync now
                  </button>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="rounded-lg border border-libro-border px-4 py-3 text-sm font-medium hover:bg-black/5"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-lg border border-libro-border bg-libro-bg px-4 py-3"
                />
                <button
                  type="button"
                  onClick={() => void handleSignIn()}
                  disabled={!email.trim()}
                  className="w-full rounded-lg bg-libro-accent px-4 py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
                >
                  Send magic link
                </button>
                {authMessage && <p className="text-sm text-green-700">{authMessage}</p>}
                {authError && <p className="text-sm text-red-600">{authError}</p>}
              </div>
            )}
          </section>
        )}

        <section className="rounded-xl border border-libro-border bg-libro-surface p-6">
          <h2 className="mb-1 text-base font-semibold">DeepL API Key</h2>
          <p className="mb-4 text-sm text-libro-muted">
            Required for tap-to-translate. Saved automatically. Get a free key at{' '}
            <a
              href="https://www.deepl.com/pro-api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-libro-accent underline"
            >
              deepl.com/pro-api
            </a>
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            onBlur={handleApiKeyBlur}
            placeholder="DeepL API key"
            className="w-full rounded-lg border border-libro-border bg-libro-bg px-4 py-3"
          />
          {keySaved && <p className="mt-2 text-sm text-green-700">Saved</p>}
        </section>

        <section className="rounded-xl border border-libro-border bg-libro-surface p-6">
          <h2 className="mb-1 text-base font-semibold">Backup &amp; Restore</h2>
          <p className="mb-4 text-sm text-libro-muted">
            Export your full library to a <code className="text-xs">.libro</code> file, or restore
            from a backup. Useful before switching devices or as a safety net.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={backupBusy}
              onClick={() => void handleExport()}
              className="w-full rounded-lg border border-libro-border px-4 py-3 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
            >
              Export library
            </button>
            <label className="w-full cursor-pointer rounded-lg border border-libro-border px-4 py-3 text-center text-sm font-medium hover:bg-black/5">
              Import backup
              <input
                type="file"
                accept=".libro,application/zip"
                className="hidden"
                disabled={backupBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleImport(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {backupMessage && <p className="mt-3 text-sm text-libro-muted">{backupMessage}</p>}
        </section>

        <section className="rounded-xl border border-libro-border bg-libro-surface p-6">
          <h2 className="mb-2 text-base font-semibold">Install App</h2>
          <p className="text-sm text-libro-muted">
            Add Libro to your home screen for an app-like experience. Use your browser&apos;s
            &quot;Add to Home Screen&quot; or &quot;Install&quot; option.
          </p>
        </section>

        {import.meta.env.DEV && <DevToolsSection />}
      </div>
    </div>
  )
}

function DevToolsSection() {
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)

  const handleSeed = async () => {
    setSeeding(true)
    setSeedMessage(null)
    try {
      const { seedPlaceholderBooks, countPlaceholderBooks, refreshPlaceholderBooks } =
        await import('../lib/placeholderBooks')
      const existing = await countPlaceholderBooks()
      if (existing >= 40) {
        const updated = await refreshPlaceholderBooks()
        setSeedMessage(`Refreshed ${updated} test books with updated dimensions.`)
        return
      }
      const added = await seedPlaceholderBooks(40 - existing)
      setSeedMessage(`Added ${added} placeholder books.`)
    } catch (e) {
      setSeedMessage(e instanceof Error ? e.message : 'Failed to seed books')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <section className="rounded-xl border border-dashed border-libro-border bg-libro-surface p-6">
      <h2 className="mb-1 text-base font-semibold">Developer</h2>
      <p className="mb-4 text-sm text-libro-muted">
        Add 40 test ebooks with varied sizes, titles, and solid-color covers for UI testing.
      </p>
      <button
        type="button"
        disabled={seeding}
        onClick={handleSeed}
        className="w-full rounded-lg border border-libro-border px-4 py-3 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
      >
        {seeding ? 'Adding books…' : 'Add 40 test books'}
      </button>
      {seedMessage && <p className="mt-3 text-sm text-libro-muted">{seedMessage}</p>}
    </section>
  )
}
