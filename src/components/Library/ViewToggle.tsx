import { LayoutGrid, ShelvingUnit } from 'lucide-react'
import type { ReactNode } from 'react'
import type { LibraryView } from '../../types'

interface ViewToggleProps {
  view: LibraryView
  onChange: (view: LibraryView) => void
}

const views: { id: LibraryView; label: string; icon: ReactNode }[] = [
  {
    id: 'grid',
    label: 'Grid',
    icon: <LayoutGrid aria-hidden="true" size={16} strokeWidth={1.75} />,
  },
  {
    id: 'shelf',
    label: 'Shelf',
    icon: <ShelvingUnit aria-hidden="true" size={16} strokeWidth={1.75} />,
  },
]

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex w-full max-w-[132px] rounded-lg border border-libro-border bg-libro-bg p-0.5">
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs transition ${
            view === v.id
              ? 'bg-libro-surface text-libro-text shadow-sm'
              : 'text-libro-muted hover:text-libro-text'
          }`}
          title={v.label}
        >
          {v.icon}
          <span>{v.label}</span>
        </button>
      ))}
    </div>
  )
}
