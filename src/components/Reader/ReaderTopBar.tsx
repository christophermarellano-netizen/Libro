import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from './ReaderIcons'

interface ReaderTopBarProps {
  visible: boolean
  title: string
  author?: string
  chapterLabel?: string
}

export function ReaderTopBar({
  visible,
  title,
  author,
  chapterLabel,
}: ReaderTopBarProps) {
  const subtitle = chapterLabel ?? author

  return (
    <header
      className={`pointer-events-auto absolute inset-x-0 top-0 z-50 border-b border-libro-border bg-libro-surface transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
      }`}
    >
      <div className="relative px-4 pb-4 pt-[max(16px,calc(env(safe-area-inset-top)+12px))] text-center">
        <Link
          to="/"
          className="absolute left-5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-full py-1 pl-0.5 pr-2 text-libro-muted transition hover:bg-black/5 hover:text-libro-text focus-visible:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
          aria-label="Library"
        >
          <ChevronLeftIcon className="h-4 w-4" strokeWidth={1.75} />
          <span className="text-sm font-medium leading-none">Library</span>
        </Link>

        <div className="px-14 sm:px-16">
          <h2 className="truncate text-lg font-semibold text-libro-text">{title}</h2>
          {subtitle && (
            <p className="truncate text-sm text-libro-muted">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  )
}
