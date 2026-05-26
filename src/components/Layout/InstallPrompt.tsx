import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferred || dismissed) return null

  return (
    <div className="flex items-center justify-between gap-3 border-b border-libro-accent/30 bg-libro-accent/10 px-4 py-2 text-sm">
      <span>Install Libro for offline reading</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt()
            setDeferred(null)
          }}
          className="rounded-lg bg-libro-accent px-3 py-1 text-white"
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg px-2 py-1 text-libro-muted"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
