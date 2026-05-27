import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CloudSyncSignIn } from '../components/Auth/CloudSyncSignIn'
import { ImportButton } from '../components/Library/ImportButton'
import { downloadLibraryBackup, importLibraryBackup } from '../lib/backup'
import { useAuth } from '../hooks/useAuth'
import { useBooks } from '../hooks/useBooks'
import { useSettings } from '../hooks/useSettings'
import { useSync } from '../hooks/useSync'

function formatSyncTime(ts: number | null): string {
  if (!ts) return 'Never'
  return new Date(ts).toLocaleString()
}

export function SettingsPage() {
  const { settings, save } = useSettings()
  const { user, configured, loading: authLoading, requestEmailOtp, verifyEmailOtp, signOut } = useAuth()
  const { status, lastSyncedAt, error, syncNow } = useSync()
  const sort = settings?.librarySort ?? 'recent'
  const { importBook } = useBooks(sort)

  const [apiKeyDraft, setApiKeyDraft] = useState<string | null>(null)
  const apiKey = apiKeyDraft ?? settings?.deeplApiKey ?? ''
  const [keySaved, setKeySaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importNotice, setImportNotice] = useState<string | null>(null)
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

  const handleEbookImport = async (files: FileList) => {
    setImporting(true)
    setImportError(null)
    setImportNotice(null)
    const importedTitles: string[] = []
    try {
      for (const file of Array.from(files)) {
        await importBook(file)
        importedTitles.push(file.name.replace(/\.epub$/i, ''))
      }
      if (importedTitles.length > 0) {
        setImportNotice(
          importedTitles.length === 1
            ? `Added “${importedTitles[0]}” to your library`
            : `Added ${importedTitles.length} books to your library`,
        )
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
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
      <header className="relative shrink-0 border-b border-libro-border bg-libro-surface">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pb-3 pt-[max(12px,calc(env(safe-area-inset-top)+12px))]">
          <Link
            to="/"
            className="justify-self-start flex min-h-11 min-w-11 items-center text-sm font-medium text-libro-muted transition hover:text-libro-text"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold">Settings</h1>
          <div className="justify-self-end" aria-hidden="true" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 space-y-6 p-6">
        <section className="rounded-xl border border-libro-border bg-libro-surface p-6">
          <h2 className="mb-1 text-base font-semibold">Add Ebook</h2>
          <p className="mb-4 text-sm text-libro-muted">
            Import a Spanish EPUB to your library. You can select multiple files at once.
          </p>
          <ImportButton
            variant="settings"
            onImport={(files) => void handleEbookImport(files)}
            importing={importing}
          />
          {importNotice && <p className="mt-3 text-sm text-green-700">{importNotice}</p>}
          {importError && <p className="mt-3 text-sm text-red-600">{importError}</p>}
        </section>

        {configured && (
          <section className="rounded-xl border border-libro-border bg-libro-surface p-6">
            <h2 className="mb-1 text-base font-semibold">Cloud Sync</h2>
            <p className="mb-4 text-sm text-libro-muted">
              Sign in on your phone and laptop to keep your library, reading progress, and settings
              in sync. Enter the 6-digit code from your email — no link required.
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
              <CloudSyncSignIn
                onRequestCode={requestEmailOtp}
                onVerifyCode={verifyEmailOtp}
              />
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
      </div>
    </div>
  )
}
