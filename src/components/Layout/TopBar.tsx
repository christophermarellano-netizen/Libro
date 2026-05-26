import { Link } from 'react-router-dom'
import { ImportButton } from '../Library/ImportButton'
import { ViewToggle } from '../Library/ViewToggle'
import type { LibrarySort, LibraryView } from '../../types'

interface TopBarProps {
  view: LibraryView
  sort: LibrarySort
  onViewChange: (view: LibraryView) => void
  onSortChange: (sort: LibrarySort) => void
  onImport: (files: FileList) => void
  importing?: boolean
}

export function TopBar({
  view,
  sort,
  onViewChange,
  onSortChange,
  onImport,
  importing,
}: TopBarProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-libro-border bg-libro-surface px-5 py-3">
      <h1 className="text-[22px] font-semibold tracking-tight text-libro-text">
        Libro
      </h1>

      <ViewToggle view={view} onChange={onViewChange} />

      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as LibrarySort)}
            className="appearance-none rounded-lg border border-libro-border bg-libro-bg py-1.5 pl-3 pr-8 text-sm text-libro-text"
          >
            <option value="recent">Recent</option>
            <option value="title">Title</option>
            <option value="author">Author</option>
          </select>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-libro-muted"
          >
            <path
              d="M7 10l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
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
    </header>
  )
}
