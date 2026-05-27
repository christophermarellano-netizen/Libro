import { useEffect } from 'react'
import type { Book } from '../../types'
import { displaySizePx } from '../../lib/bookDimensions'
import { getSpinePreset } from '../../lib/spinePresets'
import { useBookCoverUrl } from '../../hooks/useBookCoverUrl'
import { useLongPress } from '../../hooks/useLongPress'
import jointSeamSrc from '../../assets/joint-seam.png'

interface BookCardProps {
  book: Book
  scale: number
  coverSlotHeightPx?: number
  onClick: () => void
  onBookMenu?: (point: { x: number; y: number }) => void
}

export function BookCard({
  book,
  scale,
  coverSlotHeightPx,
  onClick,
  onBookMenu,
}: BookCardProps) {
  const { widthPx, heightPx } = displaySizePx(book, scale)
  const preset = getSpinePreset(book)
  const { src: coverSrc, setFailed: setCoverFailed } = useBookCoverUrl(
    book.coverBlob,
  )

  useEffect(() => {
    setCoverFailed(false)
  }, [book.id, book.coverBlob?.size, setCoverFailed])

  const { longPressProps, contextMenuProps, guardClick } = useLongPress(
    (point) => onBookMenu?.(point),
    { disabled: !onBookMenu },
  )

  return (
    <button
      type="button"
      onClick={(event) => {
        guardClick(event)
        if (!event.defaultPrevented) onClick()
      }}
      {...longPressProps}
      {...contextMenuProps}
      className="flex max-w-full cursor-pointer flex-col items-center gap-2.5 border-0 bg-transparent p-0 transition-transform hover:scale-[1.02] active:scale-[0.97]"
      style={{ width: widthPx }}
    >
      <div
        className="flex shrink-0 items-end justify-center"
        style={{
          width: widthPx,
          height: coverSlotHeightPx ?? heightPx,
        }}
      >
        <div
          className="rounded-[1.5px] shadow-[1px_3px_6px_rgba(0,0,0,0.05),2px_8px_18px_rgba(0,0,0,0.09)]"
          style={{ width: widthPx, height: heightPx }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[1.5px]">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover"
                onError={() => setCoverFailed(true)}
                draggable={false}
              />
            ) : (
              <div
                className="h-full w-full"
                style={{ backgroundColor: preset.bg, color: preset.fg }}
                aria-label={book.title}
              />
            )}
            <img
              src={jointSeamSrc}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute top-0 z-10 h-full select-none object-fill"
              style={{ left: 4, width: 9 }}
            />
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 px-0.5 text-center">
        <p className="line-clamp-3 text-[11px] font-normal leading-snug text-libro-muted">
          {book.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-libro-muted/80">
          {book.author}
        </p>
      </div>
    </button>
  )
}
