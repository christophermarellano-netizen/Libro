import {
  AppleAaIcon,
  BookmarkIcon,
  LayoutOptionsIcon,
  ListBulletIcon,
  OrientationLockIcon,
  SearchIcon,
  ShareIcon,
} from './ReaderIcons'

interface ReaderBooksMenuProps {
  open: boolean
  progressPercent: number
  bookmarked: boolean
  onClose: () => void
  onContents: () => void
  onSearch: () => void
  onSettings: () => void
  onBookmark: () => void
}

const menuRowClass =
  'flex w-full items-center justify-between px-4 py-3.5 text-left text-[17px] font-normal text-white transition hover:bg-white/5 active:bg-white/10'

const actionButtonClass =
  'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15 active:scale-95 disabled:opacity-35'

export function ReaderBooksMenu({
  open,
  progressPercent,
  bookmarked,
  onClose,
  onContents,
  onSearch,
  onSettings,
  onBookmark,
}: ReaderBooksMenuProps) {
  if (!open) return null

  const progressLabel = `${Math.round(progressPercent)}%`

  const handleContents = () => {
    onClose()
    onContents()
  }

  const handleSearch = () => {
    onClose()
    onSearch()
  }

  const handleSettings = () => {
    onClose()
    onSettings()
  }

  const handleBookmark = () => {
    onClose()
    onBookmark()
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-[55] cursor-default border-0 bg-transparent p-0"
        onClick={onClose}
      />
      <div
        role="menu"
        aria-label="Reader menu"
        className="absolute bottom-full right-0 z-[56] mb-3 w-[min(320px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(44,44,46,0.94)] shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/10">
          <button type="button" role="menuitem" className={menuRowClass} onClick={handleContents}>
            <span>Contents · {progressLabel}</span>
            <ListBulletIcon className="h-[22px] w-[22px] shrink-0 opacity-90" strokeWidth={1.65} />
          </button>
          <button type="button" role="menuitem" className={menuRowClass} onClick={handleSearch}>
            <span>Search Book</span>
            <SearchIcon className="h-[22px] w-[22px] shrink-0 opacity-90" strokeWidth={1.65} />
          </button>
          <button type="button" role="menuitem" className={menuRowClass} onClick={handleSettings}>
            <span>Themes &amp; Settings</span>
            <AppleAaIcon className="h-[22px] w-[22px] shrink-0 opacity-90" />
          </button>
        </div>

        <div className="flex items-center justify-around px-3 py-3">
          <button type="button" className={actionButtonClass} disabled aria-label="Share">
            <ShareIcon className="h-[19px] w-[19px]" strokeWidth={1.65} />
          </button>
          <button type="button" className={actionButtonClass} disabled aria-label="Orientation lock">
            <OrientationLockIcon className="h-[19px] w-[19px]" strokeWidth={1.65} />
          </button>
          <button type="button" className={actionButtonClass} disabled aria-label="Layout options">
            <LayoutOptionsIcon className="h-[19px] w-[19px]" strokeWidth={1.65} />
          </button>
          <button
            type="button"
            className={actionButtonClass}
            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
            onClick={handleBookmark}
          >
            <BookmarkIcon
              filled={bookmarked}
              className="h-[19px] w-[19px]"
              strokeWidth={1.65}
            />
          </button>
        </div>
      </div>
    </>
  )
}
