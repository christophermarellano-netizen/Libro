import type { Book } from '../../types'
import { displaySizePx } from '../../lib/bookDimensions'

interface BookCardProps {
  book: Book
  scale: number
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export function BookCard({ book, scale, onClick, onContextMenu }: BookCardProps) {
  const { widthPx, heightPx } = displaySizePx(book, scale)
  const coverSrc = URL.createObjectURL(book.coverBlob)

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="shrink-0 cursor-pointer border-0 bg-transparent p-0 transition-transform hover:scale-[1.02] active:scale-[0.97]"
      style={{ width: widthPx, height: heightPx }}
      title={book.title}
    >
      <img
        src={coverSrc}
        alt={book.title}
        className="h-full w-full object-cover shadow-[0_1px_4px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)]"
        onLoad={() => URL.revokeObjectURL(coverSrc)}
      />
    </button>
  )
}
