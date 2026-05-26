interface TranslationPopupProps {
  word: string
  translation: string | null
  loading: boolean
  error: string | null
  x: number
  y: number
  onDismiss: () => void
  onMoreContext: () => void
  onSave: () => void
}

export function TranslationPopup({
  word,
  translation,
  loading,
  error,
  x,
  y,
  onDismiss,
  onMoreContext,
  onSave,
}: TranslationPopupProps) {
  const left = Math.min(x, window.innerWidth - 280)
  const top = Math.min(y + 12, window.innerHeight - 160)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onDismiss} />
      <div
        className="fixed z-50 min-w-[240px] max-w-[280px] rounded-xl bg-libro-surface p-4 shadow-2xl ring-1 ring-libro-border"
        style={{ left, top }}
      >
        <p className="mb-1 text-lg font-semibold text-libro-accent">{word}</p>
        {loading && <p className="text-sm text-libro-muted">Translating…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {translation && !loading && (
          <p className="text-base">{translation}</p>
        )}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onMoreContext}
            className="rounded-lg bg-black/5 px-3 py-1.5 text-xs hover:bg-black/10"
          >
            More context
          </button>
          {translation && (
            <button
              type="button"
              onClick={onSave}
              className="rounded-lg bg-libro-accent px-3 py-1.5 text-xs text-white hover:opacity-80"
            >
              Save word
            </button>
          )}
        </div>
      </div>
    </>
  )
}
