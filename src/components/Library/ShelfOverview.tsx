import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '../../types'
import { libraryDisplayScale } from '../../lib/bookDimensions'
import { SpineView } from './SpineView'

interface ShelfOverviewProps {
  books: Book[]
  onOpen: (book: Book) => void
}

const DETAIL_HEIGHT_RATIO = 0.9
const SHELF_GAP = 4
const MINI_TARGET_HEIGHT = 88
const MINI_ROWS = 3
const MINI_GAP = 4

function splitIntoRows(books: Book[], rowCount: number): Book[][] {
  const booksPerRow = Math.ceil(books.length / rowCount)
  const rows: Book[][] = []

  for (let row = 0; row < rowCount; row++) {
    const slice = books.slice(row * booksPerRow, (row + 1) * booksPerRow)
    if (slice.length > 0) rows.push(slice)
  }

  return rows
}

export function ShelfOverview({ books, onOpen }: ShelfOverviewProps) {
  const detailRef = useRef<HTMLDivElement>(null)
  const [detailViewport, setDetailViewport] = useState({ width: 0, height: 0 })
  const dragSnapshot = useRef<{ x: number; scrollLeft: number } | null>(null)
  const suppressClick = useRef(false)

  const handleShelfPointerDown = useCallback((e: React.PointerEvent) => {
    const el = detailRef.current
    if (!el || e.button !== 0) return
    dragSnapshot.current = { x: e.clientX, scrollLeft: el.scrollLeft }
    suppressClick.current = false
    el.setPointerCapture(e.pointerId)
  }, [])

  const handleShelfPointerMove = useCallback((e: React.PointerEvent) => {
    const el = detailRef.current
    const snap = dragSnapshot.current
    if (!el || !snap) return
    const dx = e.clientX - snap.x
    if (Math.abs(dx) > 4) suppressClick.current = true
    if (suppressClick.current) {
      el.scrollLeft = snap.scrollLeft - dx
    }
  }, [])

  const handleShelfPointerEnd = useCallback((e: React.PointerEvent) => {
    dragSnapshot.current = null
    const el = detailRef.current
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId)
    }
  }, [])

  const handleSpineOpen = useCallback(
    (book: Book) => {
      if (suppressClick.current) {
        suppressClick.current = false
        return
      }
      onOpen(book)
    },
    [onOpen],
  )

  const detailTargetHeight = useMemo(
    () =>
      detailViewport.height > 0
        ? Math.round(detailViewport.height * DETAIL_HEIGHT_RATIO)
        : 180,
    [detailViewport.height],
  )

  const detailScale = useMemo(
    () => libraryDisplayScale(books, detailTargetHeight),
    [books, detailTargetHeight],
  )
  const miniScale = useMemo(() => libraryDisplayScale(books, MINI_TARGET_HEIGHT), [books])
  const miniRows = useMemo(() => splitIntoRows(books, MINI_ROWS), [books])

  useEffect(() => {
    const el = detailRef.current
    if (!el) return
    const update = () =>
      setDetailViewport({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (books.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-libro-muted">
        Import books to see your shelf
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Minimap */}
      <div className="relative flex h-3/5 flex-col border-b border-libro-border bg-libro-bg">
        <div className="min-h-0 flex-1 overflow-auto px-10 py-8">
          <div className="flex flex-col items-center gap-8">
            {miniRows.map((rowBooks, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-end justify-center"
                style={{ gap: MINI_GAP }}
              >
                {rowBooks.map((book) => (
                  <SpineView
                    key={book.id}
                    book={book}
                    heightPx={Math.round(book.physicalHeightMm * miniScale)}
                    showText={false}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail shelf */}
      <div
        ref={detailRef}
        className="flex h-2/5 cursor-grab items-end overflow-x-auto overflow-y-hidden border-b-[3px] border-[rgba(128,128,128,0.3)] bg-white px-10 pb-4 pt-1.5 touch-none active:cursor-grabbing"
        onPointerDown={handleShelfPointerDown}
        onPointerMove={handleShelfPointerMove}
        onPointerUp={handleShelfPointerEnd}
        onPointerCancel={handleShelfPointerEnd}
      >
        <div className="flex items-end px-1" style={{ gap: SHELF_GAP }}>
          {books.map((book) => (
            <SpineView
              key={book.id}
              book={book}
              heightPx={Math.round(book.physicalHeightMm * detailScale)}
              onClick={() => handleSpineOpen(book)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export { spineWidthPx, totalShelfWidth } from './SpineView'
