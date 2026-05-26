import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'

export function SettingsPage() {
  const { settings, save } = useSettings()
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings?.deeplApiKey) setApiKey(settings.deeplApiKey)
  }, [settings])

  const handleSave = async () => {
    await save({
      deeplApiKey: apiKey.trim() || undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-libro-border bg-libro-surface px-4 py-3">
        <Link to="/" className="text-libro-muted hover:text-libro-text">
          ← Back
        </Link>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 space-y-6 p-6">
        <section className="rounded-xl border border-libro-border bg-libro-surface p-6">
          <h2 className="mb-1 text-base font-semibold">DeepL API Key</h2>
          <p className="mb-4 text-sm text-libro-muted">
            Required for tap-to-translate. Get a free key at{' '}
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
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="DeepL API key"
            className="mb-4 w-full rounded-lg border border-libro-border bg-libro-bg px-4 py-3"
          />
        </section>

        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-lg bg-libro-accent px-4 py-3 text-sm font-medium text-white hover:opacity-80"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>

        <section className="rounded-xl border border-libro-border bg-libro-surface p-6">
          <h2 className="mb-2 text-base font-semibold">Install App</h2>
          <p className="text-sm text-libro-muted">
            Add Libro to your home screen for an app-like experience. Use your
            browser&apos;s &quot;Add to Home Screen&quot; or &quot;Install&quot; option.
          </p>
        </section>

        {import.meta.env.DEV && (
          <DevToolsSection />
        )}
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
      {seedMessage && (
        <p className="mt-3 text-sm text-libro-muted">{seedMessage}</p>
      )}
    </section>
  )
}
