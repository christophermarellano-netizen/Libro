import type { ReactNode } from 'react'
import type { LibrarySort } from '../../types'

interface LibrarySubHeaderProps {
  sort: LibrarySort
  onSortChange: (sort: LibrarySort) => void
  onSearch?: () => void
  children: ReactNode
}

export function LibrarySubHeader({
  sort,
  onSortChange,
  onSearch,
  children,
}: LibrarySubHeaderProps) {
  return (
    <div className="shrink-0 px-4 pt-6 pb-2">
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
        <div className="relative flex h-11 w-11 items-center justify-center justify-self-start">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as LibrarySort)}
            aria-label="Sort library"
            title="Sort"
            className="absolute inset-0 cursor-pointer appearance-none rounded-full border-0 bg-transparent text-transparent outline-none transition hover:bg-black/5 focus-visible:bg-black/5 focus-visible:ring-2 focus-visible:ring-black/10"
          >
            <option value="recent">Recent</option>
            <option value="title">Title</option>
            <option value="author">Author</option>
          </select>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="pointer-events-none h-4 w-4 text-libro-muted"
          >
            <path
              d="M8 7h8M8 12h5M8 17h8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="library-subheader-title min-w-0 text-center">{children}</div>

        <button
          type="button"
          aria-label="Search library"
          title="Search"
          onClick={onSearch}
          className="flex h-11 w-11 items-center justify-center justify-self-end rounded-full text-libro-muted transition hover:bg-black/5 hover:text-libro-text focus-visible:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path
              d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
