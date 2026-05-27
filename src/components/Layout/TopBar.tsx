import { Link } from 'react-router-dom'
import { ViewToggle } from '../Library/ViewToggle'
import type { LibraryView } from '../../types'

interface TopBarProps {
  view: LibraryView
  onViewChange: (view: LibraryView) => void
}

export function TopBar({ view, onViewChange }: TopBarProps) {
  return (
    <header className="relative shrink-0 border-b border-libro-border bg-libro-surface">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 pb-3 pt-[max(12px,calc(env(safe-area-inset-top)+12px))]">
        <h1 className="shrink-0 whitespace-nowrap font-['Lexend',sans-serif] text-[22px] font-semibold tracking-tight text-libro-text">
          EX LIBRO
        </h1>

        <div className="flex min-w-0 justify-center">
          <ViewToggle view={view} onChange={onViewChange} />
        </div>

        <div className="flex justify-self-end">
          <Link
            to="/settings"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-libro-muted hover:bg-black/5 hover:text-libro-text"
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
