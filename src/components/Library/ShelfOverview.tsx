import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '../../types'
import { libraryDisplayScale } from '../../lib/bookDimensions'
import { scaledSpineWidth } from '../../lib/spinePresets'
import { SpineView } from './SpineView'

interface ShelfOverviewProps {
  books: Book[]
  onOpen: (book: Book) => void
}

const SHELF_GAP = 4
const MINI_GAP = 4
const MINI_ROW_GAP = 20
const SHELF_SIDE_PADDING = 20
const MINI_VERTICAL_PADDING = 8
const DETAIL_HEIGHT_RATIO = 0.8
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

export function ShelfOverview({ books, onOpen }: ShelfOverviewProps) {
  const miniRef = useRef<HTMLDivElement>(null)
  const detailContainerRef = useRef<HTMLDivElement>(null)
  const detailScrollRef = useRef<HTMLDivElement>(null)
  const [miniViewport, setMiniViewport] = useState({ width: 0, height: 0 })
  const [detailViewport, setDetailViewport] = useState({ width: 0, height: 0 })
  const dragSnapshot = useRef<{ x: number; scrollLeft: number } | null>(null)
  const suppressClick = useRef(false)
  const [scrollIndicator, setScrollIndicator] = useState<{
    left: number
    top: number
    animateLeft: boolean
  } | null>(null)
  const activeIndicatorBookId = useRef<number | null>(null)

  const updateScrollIndicator = useCallback(() => {
    const scrollEl = detailScrollRef.current
    const miniEl = miniRef.current
    if (!scrollEl || !miniEl) return

    const detailSpines = scrollEl.querySelectorAll('[data-shelf-spine]')
    if (detailSpines.length === 0) {
      activeIndicatorBookId.current = null
      setScrollIndicator(null)
      return
    }

    const scrollRect = scrollEl.getBoundingClientRect()
    const viewportCenterX = scrollRect.left + scrollRect.width / 2

    let activeId: number | null = null
    let minDist = Infinity
    detailSpines.forEach((el) => {
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const dist = Math.abs(centerX - viewportCenterX)
      if (dist < minDist) {
        minDist = dist
        activeId = Number(el.getAttribute('data-shelf-spine'))
      }
    })

    if (activeId == null || Number.isNaN(activeId)) {
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

  const scrollToDetailBook = useCallback(
    (bookId: number) => {
      const scrollEl = detailScrollRef.current
      if (!scrollEl) return

      const spine = scrollEl.querySelector(`[data-shelf-spine="${bookId}"]`)
      if (!spine) return

      const scrollRect = scrollEl.getBoundingClientRect()
      const spineRect = spine.getBoundingClientRect()
      const spineCenterInScroll =
        spineRect.left + spineRect.width / 2 - scrollRect.left + scrollEl.scrollLeft
      const targetScrollLeft = spineCenterInScroll - scrollEl.clientWidth / 2
      const maxScrollLeft = scrollEl.scrollWidth - scrollEl.clientWidth

      scrollEl.scrollTo({
        left: Math.max(0, Math.min(targetScrollLeft, maxScrollLeft)),
        behavior: 'smooth',
      })
    },
    [],
  )

  const handleMiniSpineClick = useCallback(
    (book: Book) => {
      if (book.id == null) return
      scrollToDetailBook(book.id)
    },
    [scrollToDetailBook],
  )

  const handleShelfPointerDown = useCallback((e: React.PointerEvent) => {
    const el = detailScrollRef.current
    if (!el || e.button !== 0) return
    dragSnapshot.current = { x: e.clientX, scrollLeft: el.scrollLeft }
    suppressClick.current = false
    el.setPointerCapture(e.pointerId)
  }, [])

  const handleShelfPointerMove = useCallback((e: React.PointerEvent) => {
    const el = detailScrollRef.current
    const snap = dragSnapshot.current
    if (!el || !snap) return
    const dx = e.clientX - snap.x
    if (Math.abs(dx) > 4) suppressClick.current = true
    if (suppressClick.current) {
      el.scrollLeft = snap.scrollLeft - dx
      updateScrollIndicator()
    }
  }, [updateScrollIndicator])

  const handleShelfPointerEnd = useCallback((e: React.PointerEvent) => {
    dragSnapshot.current = null
    const el = detailScrollRef.current
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

  const miniTargetHeight = useMemo(
    () =>
      miniViewport.height > 0
        ? miniTargetHeightForViewport(books, miniViewport.height, miniViewport.width)
        : MINI_TARGET_FALLBACK,
    [books, miniViewport.height, miniViewport.width],
  )

  const detailTargetHeight = useMemo(
    () =>
      detailViewport.height > 0
        ? Math.max(48, Math.round(detailViewport.height * DETAIL_HEIGHT_RATIO))
        : 180,
    [detailViewport.height],
  )

  const miniScale = useMemo(
    () => libraryDisplayScale(books, miniTargetHeight),
    [books, miniTargetHeight],
  )
  const detailScale = useMemo(
    () => libraryDisplayScale(books, detailTargetHeight),
    [books, detailTargetHeight],
  )

  const miniInnerWidth = Math.max(0, miniViewport.width - SHELF_SIDE_PADDING * 2)

  const miniRows = useMemo(
    () =>
      packMiniRowsGrouped(books, miniInnerWidth, miniTargetHeight, MINI_GAP).rows,
    [books, miniInnerWidth, miniTargetHeight],
  )

  const miniShelfHeight = shelfBandHeightPx(miniTargetHeight)
  const detailShelfHeight = shelfBandHeightPx(detailTargetHeight)

  useEffect(() => {
    const miniEl = miniRef.current
    const detailEl = detailContainerRef.current
    if (!miniEl || !detailEl) return

    const updateMini = () =>
      setMiniViewport({ width: miniEl.clientWidth, height: miniEl.clientHeight })
    const updateDetail = () =>
      setDetailViewport({ width: detailEl.clientWidth, height: detailEl.clientHeight })

    updateMini()
    updateDetail()

    const miniObserver = new ResizeObserver(updateMini)
    const detailObserver = new ResizeObserver(updateDetail)
    miniObserver.observe(miniEl)
    detailObserver.observe(detailEl)

    return () => {
      miniObserver.disconnect()
      detailObserver.disconnect()
    }
  }, [books.length])

  useEffect(() => {
    const scrollEl = detailScrollRef.current
    const miniEl = miniRef.current
    if (!scrollEl) return

    const update = () => updateScrollIndicator()
    update()

    scrollEl.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    const observer = new ResizeObserver(update)
    observer.observe(scrollEl)
    if (miniEl) observer.observe(miniEl)

    return () => {
      scrollEl.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [
    updateScrollIndicator,
    books,
    miniRows,
    miniScale,
    detailScale,
    miniShelfHeight,
    detailShelfHeight,
  ])

  if (books.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-libro-muted">
        Import books to see your shelf
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F1F1F1]">
      {/* Minimap */}
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

      {/* Detail shelf */}
      <div
        ref={detailContainerRef}
        className="flex min-h-0 flex-[2] flex-col justify-end overflow-visible bg-white"
      >
        <div
          className="relative w-full shrink-0"
          style={{ height: detailShelfHeight + SHELF_LIP_TOTAL_PX }}
        >
          <div
            ref={detailScrollRef}
            className="shelf-band shelf-band-white no-scrollbar absolute inset-x-0 top-0 flex cursor-grab items-end overflow-x-auto overflow-y-hidden touch-none active:cursor-grabbing"
            style={{ height: detailShelfHeight }}
            onPointerDown={handleShelfPointerDown}
            onPointerMove={handleShelfPointerMove}
            onPointerUp={handleShelfPointerEnd}
            onPointerCancel={handleShelfPointerEnd}
          >
            <div
              className="relative z-10 flex items-end px-1"
              style={{ gap: SHELF_GAP, paddingInline: SHELF_SIDE_PADDING }}
            >
              {books.map((book) => (
                <div key={book.id} data-shelf-spine={book.id} className="shrink-0">
                  <SpineView
                    book={book}
                    heightPx={Math.round(book.physicalHeightMm * detailScale)}
                    className="rounded-[1.5px]"
                    onClick={() => handleSpineOpen(book)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { spineWidthPx, totalShelfWidth } from './SpineView'
