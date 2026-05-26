import type { Book } from '../../types'
import { displaySizePx } from '../../lib/bookDimensions'
import jointSeamSrc from '../../assets/joint-seam.png'

interface BookCardProps {
  book: Book
  scale: number
  coverSlotHeightPx?: number
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export function BookCard({
  book,
  scale,
  coverSlotHeightPx,
  onClick,
  onContextMenu,
}: BookCardProps) {
  const { widthPx, heightPx } = displaySizePx(book, scale)
  const coverSrc = URL.createObjectURL(book.coverBlob)

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="flex cursor-pointer flex-col items-center gap-2.5 border-0 bg-transparent p-0 transition-transform hover:scale-[1.02] active:scale-[0.97]"
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
          <img
            src={coverSrc}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            onLoad={() => URL.revokeObjectURL(coverSrc)}
          />
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

      <div className="w-full min-w-0 text-center">
        <p className="line-clamp-3 text-[9px] font-normal leading-tight text-neutral-400">
          {book.title}
        </p>
        <p className="mt-px line-clamp-2 text-[8px] leading-tight text-neutral-400/70">
          {book.author}
        </p>
      </div>
    </button>
  )
}
