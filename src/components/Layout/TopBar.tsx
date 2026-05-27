import { Link } from 'react-router-dom'
import { ImportButton } from '../Library/ImportButton'
import { ViewToggle } from '../Library/ViewToggle'
import type { LibraryView } from '../../types'

interface TopBarProps {
  view: LibraryView
  onViewChange: (view: LibraryView) => void
  onImport: (files: FileList) => void
  importing?: boolean
}

export function TopBar({
  view,
  onViewChange,
  onImport,
  importing,
}: TopBarProps) {
  return (
    <header className="relative shrink-0 border-b border-libro-border bg-libro-surface">
      <div className="relative flex items-center justify-between gap-4 px-5 pb-3 pt-[max(12px,calc(env(safe-area-inset-top)+12px))]">
        <h1 className="relative z-10 text-[22px] font-semibold tracking-tight text-libro-text">
          Libro
        </h1>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <ViewToggle view={view} onChange={onViewChange} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
        <ImportButton onImport={onImport} importing={importing} />
        <Link
          to="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-libro-muted hover:bg-black/5 hover:text-libro-text"
          title="Settings"
          aria-label="Settings"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]" aria-hidden>
            <path
              d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.51-1 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        </div>
      </div>
    </header>
  )
}
