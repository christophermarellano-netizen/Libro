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
    <div className="relative shrink-0 px-4 pt-6 text-center">
      {children}
      <div className="absolute left-5 top-1/2 -translate-y-1/2">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as LibrarySort)}
          aria-label="Sort library"
          title="Sort"
          className="h-8 w-8 cursor-pointer appearance-none rounded-full border-0 bg-transparent text-transparent outline-none transition hover:bg-black/5 focus-visible:bg-black/5 focus-visible:ring-2 focus-visible:ring-black/10"
        >
          <option value="recent">Recent</option>
          <option value="title">Title</option>
          <option value="author">Author</option>
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-libro-muted"
        >
          <path
            d="M8 7h8M8 12h5M8 17h8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <button
        type="button"
        aria-label="Search library"
        title="Search"
        onClick={onSearch}
        className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-libro-muted transition hover:bg-black/5 hover:text-libro-text focus-visible:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
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
  )
}
