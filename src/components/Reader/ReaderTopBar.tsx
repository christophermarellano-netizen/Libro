import { Link } from 'react-router-dom'
import type { ReaderTheme } from '../../types'
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ListBulletIcon,
  SearchIcon,
  TextFormatIcon,
} from './ReaderIcons'

interface ReaderTopBarProps {
  visible: boolean
  theme: ReaderTheme
  title: string
  chapterLabel?: string
  bookmarked: boolean
  onSearch: () => void
  onContents: () => void
  onBookmark: () => void
  onSettings: () => void
}

export function ReaderTopBar({
  visible,
  theme,
  title,
  chapterLabel,
  bookmarked,
  onSearch,
  onContents,
  onBookmark,
  onSettings,
}: ReaderTopBarProps) {
  return (
    <header
      className={`reader-chrome-top pointer-events-auto absolute inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
      }`}
      data-reader-theme={theme}
    >
      <div className="flex h-11 items-stretch px-1 sm:px-2">
        <Link
          to="/"
          className="reader-chrome-link flex min-w-[44px] items-center gap-0.5 pl-1 pr-2"
          aria-label="Library"
        >
          <ChevronLeftIcon className="h-[22px] w-[22px]" strokeWidth={2.25} />
          <span className="text-[17px] leading-none">Library</span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-2">
          <p className="reader-chrome-title w-full truncate text-center text-[15px] font-semibold leading-tight tracking-[-0.01em]">
            {title}
          </p>
          {chapterLabel && (
            <p className="reader-chrome-subtitle w-full truncate text-center text-[12px] leading-tight">
              {chapterLabel}
            </p>
          )}
        </div>

        <div className="flex items-center">
          <ChromeIconButton label="Search" onClick={onSearch}>
            <SearchIcon />
          </ChromeIconButton>
          <ChromeIconButton label="Contents" onClick={onContents}>
            <ListBulletIcon />
          </ChromeIconButton>
          <ChromeIconButton label={bookmarked ? 'Remove bookmark' : 'Add bookmark'} onClick={onBookmark}>
            <BookmarkIcon filled={bookmarked} className={bookmarked ? 'text-[var(--reader-tint)]' : undefined} />
          </ChromeIconButton>
          <ChromeIconButton label="Appearance" onClick={onSettings}>
            <TextFormatIcon />
          </ChromeIconButton>
        </div>
      </div>
    </header>
  )
}

function ChromeIconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="reader-chrome-icon-btn flex h-11 w-11 items-center justify-center"
    >
      {children}
    </button>
  )
}
