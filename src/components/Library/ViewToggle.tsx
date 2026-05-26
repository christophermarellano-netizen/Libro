import type { LibraryView } from '../../types'

interface ViewToggleProps {
  view: LibraryView
  onChange: (view: LibraryView) => void
}

const views: { id: LibraryView; label: string; icon: string }[] = [
  { id: 'grid', label: 'Grid', icon: '▦' },
  { id: 'coverflow', label: 'Flow', icon: '▥' },
  { id: 'shelf', label: 'Shelf', icon: '≡' },
]

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg border border-libro-border bg-libro-bg p-0.5">
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            view === v.id
              ? 'bg-libro-surface text-libro-text shadow-sm'
              : 'text-libro-muted hover:text-libro-text'
          }`}
          title={v.label}
        >
          {v.icon}
        </button>
      ))}
    </div>
  )
}
