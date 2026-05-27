import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '../../types'
import { libraryDisplayScale } from '../../lib/bookDimensions'
import { scaledSpineWidth } from '../../lib/spinePresets'
import {
  CoverFlowCarousel,
  type CoverFlowCarouselHandle,
} from './CoverFlowCarousel'
import { SpineView } from './SpineView'

interface ShelfOverviewProps {
  books: Book[]
  onOpen: (book: Book) => void
  onFocusedBookChange?: (book: Book | null) => void
  onBookMenu?: (book: Book, point: { x: number; y: number }) => void
}

const MINI_GAP = 4
const MINI_ROW_GAP = 20
const SHELF_SIDE_PADDING = 20
const MINI_VERTICAL_PADDING = 8
const MINI_TARGET_FALLBACK = 88
const SHELF_HEIGHT_RATIO = 1.1
const SHELF_LIP_OFFSET_PX = 8
const SHELF_LIP_HEIGHT_PX = 0.5
const SHELF_LIP_TOTAL_PX = SHELF_LIP_OFFSET_PX + SHELF_LIP_HEIGHT_PX
const INDICATOR_BELOW_LIP_PX = 2
const INDICATOR_ROW_TOP_THRESHOLD = 8

function shelfBandHeightPx(targetTallestPx: number): number {
  return Math.max(1, Math.round(targetTallestPx * SHELF_HEIGHT_RATIO))
}

function packMiniRowsGrouped(
  books: Book[],
  innerWidth: number,
  targetTallestPx: number,
  gap: number,
): { rows: Book[][]; scale: number } {
  if (books.length === 0 || innerWidth <= 0) {
    return { rows: [], scale: 1 }
  }

  const scale = libraryDisplayScale(books, targetTallestPx)
  const rows: Book[][] = []
  let currentRow: Book[] = []
  let rowWidth = 0

  for (const book of books) {
    const heightPx = Math.round(book.physicalHeightMm * scale)
    const widthPx = scaledSpineWidth(book, heightPx)
    const next = rowWidth === 0 ? widthPx : rowWidth + gap + widthPx

    if (next > innerWidth && currentRow.length > 0) {
      rows.push(currentRow)
      currentRow = [book]
      rowWidth = widthPx
    } else {
      currentRow.push(book)
      rowWidth = next
    }
  }

  if (currentRow.length > 0) rows.push(currentRow)

  return { rows, scale }
}

function packMiniRows(
  books: Book[],
  innerWidth: number,
  targetTallestPx: number,
  gap: number,
  rowGap: number,
): { rowCount: number; totalHeight: number } {
  if (books.length === 0 || innerWidth <= 0) {
    return { rowCount: 0, totalHeight: 0 }
  }

  const { rows } = packMiniRowsGrouped(books, innerWidth, targetTallestPx, gap)
  const shelfH = shelfBandHeightPx(targetTallestPx)
  const rowHeight = shelfH + SHELF_LIP_TOTAL_PX
  const totalHeight =
    rows.length === 0 ? 0 : rows.length * rowHeight + (rows.length - 1) * rowGap

  return { rowCount: rows.length, totalHeight }
}

function miniTargetHeightForViewport(
  books: Book[],
  viewportHeight: number,
  viewportWidth: number,
): number {
  const availableHeight = viewportHeight - MINI_VERTICAL_PADDING
  const innerWidth = viewportWidth - SHELF_SIDE_PADDING * 2
  if (availableHeight <= 0 || innerWidth <= 0 || books.length === 0) {
    return MINI_TARGET_FALLBACK
  }

  let best = MINI_TARGET_FALLBACK
  let bestFill = 0
  let bestRowCount = 0

  for (let trial = 16; trial <= availableHeight; trial++) {
    const { rowCount, totalHeight } = packMiniRows(
      books,
      innerWidth,
      trial,
      MINI_GAP,
      MINI_ROW_GAP,
    )
    if (totalHeight > availableHeight) continue

    const fillsMore = totalHeight > bestFill
    const sameFillMoreRows = totalHeight === bestFill && rowCount > bestRowCount

    if (fillsMore || sameFillMoreRows) {
      bestFill = totalHeight
      bestRowCount = rowCount
      best = trial
    }
  }

  return best
}

export function ShelfOverview({
  books,
  onOpen,
  onFocusedBookChange,
  onBookMenu,
}: ShelfOverviewProps) {
  const miniRef = useRef<HTMLDivElement>(null)
  const coverFlowRef = useRef<CoverFlowCarouselHandle>(null)
  const [miniViewport, setMiniViewport] = useState({ width: 0, height: 0 })
  const [scrollIndicator, setScrollIndicator] = useState<{
    left: number
    top: number
    animateLeft: boolean
  } | null>(null)
  const activeIndicatorBookId = useRef<number | null>(null)

  const updateScrollIndicator = useCallback((activeId: number | null) => {
    const miniEl = miniRef.current
    if (!miniEl || activeId == null) {
      activeIndicatorBookId.current = null
      setScrollIndicator(null)
      return
    }

    const miniSpine = miniEl.querySelector(`[data-shelf-spine="${activeId}"]`)
    if (!miniSpine) {
      activeIndicatorBookId.current = null
      setScrollIndicator(null)
      return
    }

    const shelfBand = miniSpine.closest('.shelf-band')
    if (!shelfBand) {
      activeIndicatorBookId.current = null
      setScrollIndicator(null)
      return
    }

    const miniRect = miniEl.getBoundingClientRect()
    const spineRect = miniSpine.getBoundingClientRect()
    const shelfBandRect = shelfBand.getBoundingClientRect()
    const lipBottom =
      shelfBandRect.bottom + SHELF_LIP_OFFSET_PX + SHELF_LIP_HEIGHT_PX
    const next = {
      left: spineRect.left + spineRect.width / 2 - miniRect.left,
      top: lipBottom - miniRect.top + INDICATOR_BELOW_LIP_PX,
    }

    const bookChanged = activeIndicatorBookId.current !== activeId
    activeIndicatorBookId.current = activeId

    setScrollIndicator((prev) => {
      if (
        !bookChanged &&
        prev &&
        Math.abs(prev.left - next.left) < 0.5 &&
        Math.abs(prev.top - next.top) < 0.5
      ) {
        return prev
      }

      const rowChanged = Boolean(
        prev && Math.abs(prev.top - next.top) > INDICATOR_ROW_TOP_THRESHOLD,
      )

      return {
        ...next,
        animateLeft: !rowChanged,
      }
    })
  }, [])

  const handleFocusedBookChange = useCallback(
    (book: Book | null) => {
      updateScrollIndicator(book?.id ?? null)
      onFocusedBookChange?.(book)
    },
    [onFocusedBookChange, updateScrollIndicator],
  )

  const handleMiniSpineClick = useCallback((book: Book) => {
    if (book.id == null) return
    coverFlowRef.current?.focusBookById(book.id)
  }, [])

  const miniTargetHeight = useMemo(
    () =>
      miniViewport.height > 0
        ? miniTargetHeightForViewport(books, miniViewport.height, miniViewport.width)
        : MINI_TARGET_FALLBACK,
    [books, miniViewport.height, miniViewport.width],
  )

  const miniScale = useMemo(
    () => libraryDisplayScale(books, miniTargetHeight),
    [books, miniTargetHeight],
  )

  const miniInnerWidth = Math.max(0, miniViewport.width - SHELF_SIDE_PADDING * 2)

  const miniRows = useMemo(
    () =>
      packMiniRowsGrouped(books, miniInnerWidth, miniTargetHeight, MINI_GAP).rows,
    [books, miniInnerWidth, miniTargetHeight],
  )

  const miniShelfHeight = shelfBandHeightPx(miniTargetHeight)

  useEffect(() => {
    const miniEl = miniRef.current
    if (!miniEl) return

    const updateMini = () =>
      setMiniViewport({ width: miniEl.clientWidth, height: miniEl.clientHeight })

    updateMini()
    const miniObserver = new ResizeObserver(updateMini)
    miniObserver.observe(miniEl)

    return () => miniObserver.disconnect()
  }, [books.length])

  useEffect(() => {
    const miniEl = miniRef.current
    if (!miniEl) return

    const update = () => {
      if (activeIndicatorBookId.current != null) {
        updateScrollIndicator(activeIndicatorBookId.current)
      }
    }

    window.addEventListener('resize', update)
    const observer = new ResizeObserver(update)
    observer.observe(miniEl)

    return () => {
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [updateScrollIndicator, books, miniRows, miniScale, miniShelfHeight])

  if (books.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-libro-muted">
        Import books to see your shelf
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F1F1F1]">
      <div
        ref={miniRef}
        className="relative flex min-h-0 flex-[3] flex-col overflow-hidden bg-[#F1F1F1]"
      >
        {scrollIndicator && (
          <div
            aria-hidden="true"
            className={`shelf-scroll-indicator pointer-events-none absolute z-20 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-black${scrollIndicator.animateLeft ? '' : ' shelf-scroll-indicator--instant'}`}
            style={{ left: scrollIndicator.left, top: scrollIndicator.top }}
          />
        )}
        <div
          className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden"
          style={{ paddingTop: MINI_VERTICAL_PADDING }}
        >
          <div className="flex w-full flex-col" style={{ gap: MINI_ROW_GAP }}>
            {miniRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="relative w-full shrink-0"
                style={{ height: miniShelfHeight + SHELF_LIP_TOTAL_PX }}
              >
                <div
                  className="shelf-band absolute inset-x-0 top-0 flex items-end justify-center"
                  style={{ height: miniShelfHeight }}
                >
                  <div
                    className="relative z-10 flex items-end justify-center"
                    style={{
                      gap: MINI_GAP,
                      paddingInline: SHELF_SIDE_PADDING,
                    }}
                  >
                    {row.map((book) => (
                      <div
                        key={book.id}
                        data-shelf-spine={book.id}
                        className="shrink-0"
                      >
                        <SpineView
                          book={book}
                          heightPx={Math.round(book.physicalHeightMm * miniScale)}
                          onClick={() => handleMiniSpineClick(book)}
                          onBookMenu={
                            onBookMenu
                              ? (point) => onBookMenu(book, point)
                              : undefined
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-[2] flex-col overflow-hidden bg-white">
        <CoverFlowCarousel
          ref={coverFlowRef}
          books={books}
          onOpen={onOpen}
          onFocusedBookChange={handleFocusedBookChange}
          onBookMenu={onBookMenu}
          contentPaddingTop={21}
          contentPaddingBottom={24}
          rowHeightScale={0.91}
        />
      </div>
    </div>
  )
}

export { spineWidthPx, totalShelfWidth } from './SpineView'
