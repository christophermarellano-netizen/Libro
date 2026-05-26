import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '../../types'
import {
  displaySizePx,
  libraryDisplayScale,
  LIBRARY_ROW_TARGET_HEIGHT,
} from '../../lib/bookDimensions'
import { BookCard } from './BookCard'

interface CoverGridProps {
  books: Book[]
  onOpen: (book: Book) => void
  onDelete: (book: Book) => void
}

function gridScaleForColumn(
  books: Book[],
  columnWidth: number,
): number {
  const baseScale = libraryDisplayScale(books, LIBRARY_ROW_TARGET_HEIGHT)
  if (books.length === 0 || columnWidth <= 0) return baseScale

  const maxWidthPx = Math.max(
    ...books.map((book) => displaySizePx(book, baseScale).widthPx),
    1,
  )
  const limit = columnWidth * 0.98
  if (maxWidthPx <= limit) return baseScale

  return baseScale * (limit / maxWidthPx)
}

export function CoverGrid({ books, onOpen, onDelete }: CoverGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [columnWidth, setColumnWidth] = useState(0)
  const [columnCount, setColumnCount] = useState(3)

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const measure = () => {
      const cells = [...grid.querySelectorAll('[data-grid-cell]')] as HTMLElement[]
      const cell = cells[0]
      setColumnWidth(cell?.clientWidth ?? 0)

      if (cells.length <= 1) {
        setColumnCount(Math.max(1, cells.length))
        return
      }

      const firstTop = cells[0].offsetTop
      let cols = 1
      for (let i = 1; i < cells.length; i++) {
        if (cells[i].offsetTop === firstTop) cols++
        else break
      }
      setColumnCount(cols)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(grid)
    return () => ro.disconnect()
  }, [books.length])

  const scale = useMemo(
    () => gridScaleForColumn(books, columnWidth),
    [books, columnWidth],
  )

  const rowCoverSlotHeights = useMemo(() => {
    const heights = books.map((book) => displaySizePx(book, scale).heightPx)
    const rowMax: number[] = []
    for (let i = 0; i < heights.length; i++) {
      const row = Math.floor(i / columnCount)
      rowMax[row] = Math.max(rowMax[row] ?? 0, heights[i])
    }
    return rowMax
  }, [books, scale, columnCount])

  if (books.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-libro-muted">
        <p className="text-lg">Your library is empty</p>
        <p className="text-sm">Import a Spanish EPUB to get started</p>
      </div>
    )
  }

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-3 gap-x-8 gap-y-14 p-5 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-x-10 sm:gap-y-16 sm:p-10"
    >
      {books.map((book, index) => (
        <div
          key={book.id}
          data-grid-cell
          className="flex min-w-0 flex-col items-center"
        >
          <BookCard
            book={book}
            scale={scale}
            coverSlotHeightPx={rowCoverSlotHeights[Math.floor(index / columnCount)]}
            onClick={() => onOpen(book)}
            onContextMenu={(e) => {
              e.preventDefault()
              if (confirm(`Delete "${book.title}"?`)) onDelete(book)
            }}
          />
        </div>
      ))}
    </div>
  )
}
