import { useEffect, useState } from 'react'
import { BookType } from 'lucide-react'
import { BooksMenuIcon, ClockIcon } from './ReaderIcons'
import { ReaderBooksMenu } from './ReaderBooksMenu'

interface ReaderBottomBarProps {
  chromeVisible: boolean
  readingTimeLabel: string
  progressPercent: number
  translationEnabled: boolean
  bookmarked: boolean
  onContents: () => void
  onSearch: () => void
  onSettings: () => void
  onBookmark: () => void
  onToggleTranslation: () => void
}

const circleButtonClass =
  'flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition active:scale-95'

const translateButtonClass = (enabled: boolean) =>
  enabled
    ? 'bg-black text-white'
    : 'border-2 border-neutral-300 bg-neutral-100 text-neutral-400'

export function ReaderBottomBar({
  chromeVisible,
  readingTimeLabel,
  progressPercent,
  translationEnabled,
  bookmarked,
  onContents,
  onSearch,
  onSettings,
  onBookmark,
  onToggleTranslation,
}: ReaderBottomBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!chromeVisible) setMenuOpen(false)
  }, [chromeVisible])

  return (
    <div className="flex items-end justify-between px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
      <div
        className="flex items-center gap-2.5 rounded-full bg-black px-4 py-3 text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)]"
        aria-label={`Reading time today: ${readingTimeLabel}`}
      >
        <ClockIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        <span className="min-w-[3.5ch] tabular-nums text-[17px] font-medium leading-none">
          {readingTimeLabel}
        </span>
      </div>

      <div className="relative flex items-center gap-3">
        <ReaderBooksMenu
          open={menuOpen}
          progressPercent={progressPercent}
          bookmarked={bookmarked}
          onClose={() => setMenuOpen(false)}
          onContents={onContents}
          onSearch={onSearch}
          onSettings={onSettings}
          onBookmark={onBookmark}
        />

        <button
          type="button"
          className={`${circleButtonClass} bg-black text-white ${menuOpen ? 'ring-2 ring-white/30' : ''}`}
          aria-label="Reader menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title="Menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <BooksMenuIcon className="h-[22px] w-[22px]" strokeWidth={1.85} />
        </button>

        <button
          type="button"
          className={`${circleButtonClass} ${translateButtonClass(translationEnabled)}`}
          aria-label={translationEnabled ? 'Turn translations off' : 'Turn translations on'}
          aria-pressed={translationEnabled}
          title={translationEnabled ? 'Translations on — tap words to translate' : 'Translations off'}
          onClick={onToggleTranslation}
        >
          <BookType
            className={`h-[22px] w-[22px] ${translationEnabled ? '' : 'opacity-70'}`}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      </div>
    </div>
  )
}
