import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import type { Book } from '../../types'
import { displaySizePx, libraryDisplayScale, LIBRARY_ROW_TARGET_HEIGHT } from '../../lib/bookDimensions'
import { isSeedPlaceholderBook } from '../../lib/placeholderBooks'
import { getSpinePreset } from '../../lib/spinePresets'
import { SpineView, spineWidthPx } from './SpineView'
import jointSeamSrc from '../../assets/joint-seam.png'

interface CoverFlowCarouselProps {
  books: Book[]
  onOpen: (book: Book) => void
  onFocusedBookChange?: (book: Book | null) => void
}

const ITEM_GAP = 4
const TURN_CLEARANCE = 28
const TURN_DURATION_MS = 460
const DRAG_THRESHOLD_PX = 12

const turnTransition = {
  duration: 0.68,
  ease: [0.22, 1, 0.36, 1] as const,
}
const closeTurnTransition = {
  duration: 0.46,
  ease: [0.22, 1, 0.36, 1] as const,
}
const scrollTransition = {
  duration: 0.56,
  ease: [0.22, 1, 0.36, 1] as const,
}

// #region agent log
function debugCoverFlow(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  fetch('http://127.0.0.1:7297/ingest/69a877fb-c9b8-48e3-b765-1a3389617b66', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '91d08a',
    },
    body: JSON.stringify({
      sessionId: '91d08a',
      runId: 'pre-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
}
// #endregion

function eventTargetSummary(target: EventTarget | null) {
  const el = target instanceof HTMLElement ? target : null
  const indexed = el?.closest('[data-coverflow-index]') as HTMLElement | null
  return {
    tag: el?.tagName ?? null,
    className: el?.className ?? null,
    coverflowIndex: indexed?.dataset.coverflowIndex ?? null,
  }
}

type BookMode = 'spine' | 'focused' | 'closing'

function CoverFlowBook({
  book,
  slotWidth,
  coverWidth,
  height,
  spineWidth,
  fallbackBg,
  fallbackFg,
  useFallbackCover,
  mode,
  onOpen,
  onFocus,
  onCoverError,
}: {
  book: Book
  slotWidth: number
  coverWidth: number
  height: number
  spineWidth: number
  fallbackBg: string
  fallbackFg: string
  useFallbackCover: boolean
  mode: BookMode
  onOpen: () => void
  onFocus: () => void
  onCoverError: () => void
}) {
  const sideWidth = Math.max(14, Math.min(spineWidth, 34))
  const coverInset = TURN_CLEARANCE
  const openDoorAngle = 84
  const closeDoorAngle = 90
  const spineDoorAngle = -84
  const isFocused = mode === 'focused'
  const isClosing = mode === 'closing'
  const isActiveBook = mode !== 'spine'
  const coverSrc = useMemo(() => {
    if (!isActiveBook || useFallbackCover || !book.coverBlob || book.coverBlob.size === 0) {
      return null
    }
    return URL.createObjectURL(book.coverBlob)
  }, [
    isActiveBook,
    useFallbackCover,
    book.id,
    book.coverBlob?.size,
    book.coverBlob?.type,
  ])

  useEffect(() => {
    if (!coverSrc) return
    return () => URL.revokeObjectURL(coverSrc)
  }, [coverSrc])
  const bookTurnTransition = mode === 'closing' ? closeTurnTransition : turnTransition
  const handleClick = () => {
    // #region agent log
    debugCoverFlow('H1', 'CoverFlowCarousel.tsx:72', 'book button click', {
      bookId: book.id,
      mode,
      isFocused,
      slotWidth,
      coverWidth,
      spineWidth,
    })
    // #endregion
    if (isFocused) onOpen()
    else onFocus()
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className="absolute bottom-0 block cursor-pointer border-0 bg-transparent p-0"
      style={{
        width: slotWidth,
        height,
        perspective: 900,
        transformOrigin: 'left center',
        transformStyle: 'preserve-3d',
      }}
      initial={false}
      animate={{
        left: isActiveBook ? coverInset - sideWidth : 0,
        width: slotWidth,
        rotateY: 0,
        x: 0,
      }}
      transition={bookTurnTransition}
    >
      {!isActiveBook && (
        <div className="absolute bottom-0 left-0">
          <SpineView
            book={book}
            heightPx={height}
            widthPx={sideWidth}
            showText
            className="rounded-[1.5px] shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
          />
        </div>
      )}

      {isActiveBook && (
        <motion.div
          className="absolute bottom-0 left-0 overflow-hidden rounded-[1.5px] shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
          style={{
            left: sideWidth,
            width: coverWidth,
            height,
            transformOrigin: 'left center',
            backfaceVisibility: 'hidden',
          }}
          initial={mode === 'focused' ? { rotateY: openDoorAngle, x: 0 } : false}
          animate={{
            rotateY: isFocused ? 0 : isClosing ? closeDoorAngle : openDoorAngle,
            x: 0,
          }}
          transition={bookTurnTransition}
        >
          {useFallbackCover || coverSrc == null ? (
            <div
              className="h-full w-full"
              style={{ backgroundColor: fallbackBg, color: fallbackFg }}
              aria-label={book.title}
            />
          ) : (
            <img
              src={coverSrc}
              alt={book.title}
              className="block h-full w-full object-cover"
              onError={onCoverError}
            />
          )}
          {isFocused && (
            <img
              src={jointSeamSrc}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute top-0 z-10 h-full select-none object-fill"
              style={{ left: 4, width: 9 }}
            />
          )}
        </motion.div>
      )}

      {isActiveBook && (
        <motion.div
          className="absolute bottom-0 left-0 top-0 overflow-hidden rounded-[1.5px] shadow-[-6px_0_14px_rgba(0,0,0,0.16)_inset]"
          style={{
            width: sideWidth,
            transformOrigin: 'right center',
            backfaceVisibility: 'hidden',
          }}
          initial={mode === 'focused' ? { rotateY: 0 } : false}
          animate={{ rotateY: isFocused ? spineDoorAngle : 0 }}
          transition={bookTurnTransition}
        >
          <SpineView
            book={book}
            heightPx={height}
            widthPx={sideWidth}
            showText={!isFocused}
            className="rounded-[1.5px] shadow-[-6px_0_14px_rgba(0,0,0,0.16)_inset]"
          />
        </motion.div>
      )}
    </motion.button>
  )
}

export function CoverFlowCarousel({
  books,
  onOpen,
  onFocusedBookChange,
}: CoverFlowCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [closingIndex, setClosingIndex] = useState<number | null>(null)
  const [failedCovers, setFailedCovers] = useState<Set<string>>(() => new Set())
  const scrollX = useMotionValue(0)
  const wheelLock = useRef(false)
  const dragSnapshot = useRef<{ x: number; scrollX: number } | null>(null)
  const pointerDownIndex = useRef<number | null>(null)
  const suppressClick = useRef(false)
  const suppressReset = useRef<number | null>(null)
  const closeTimer = useRef<number | null>(null)
  const hasInitializedScroll = useRef(false)

  const activeCoverIndex = focusedIndex ?? closingIndex
  const focusedBook =
    activeCoverIndex == null ? null : books[activeCoverIndex]

  useEffect(() => {
    onFocusedBookChange?.(focusedBook)
  }, [focusedBook, onFocusedBookChange])

  useEffect(() => {
    return () => onFocusedBookChange?.(null)
  }, [onFocusedBookChange])

  const rowScale = useMemo(
    () => libraryDisplayScale(books, LIBRARY_ROW_TARGET_HEIGHT),
    [books],
  )
  const bookSize = useCallback(
    (book: Book) => displaySizePx(book, rowScale),
    [rowScale],
  )
  const spineHeightPx = useCallback(
    (book: Book) => bookSize(book).heightPx,
    [bookSize],
  )

  const slotWidth = useCallback(
    (index: number, focusIdx: number | null) => {
      const book = books[index]
      const spineSlotWidth = Math.max(18, Math.min(spineWidthPx(book, spineHeightPx(book)), 42))
      if (index === focusIdx) {
        return bookSize(book).widthPx + TURN_CLEARANCE * 2
      }
      return spineSlotWidth
    },
    [books, bookSize, spineHeightPx],
  )

  const getOffsetForIndex = useCallback(
    (index: number, focusIdx: number) => {
      if (!containerRef.current) return 0
      const containerWidth = containerRef.current.offsetWidth
      if (containerWidth === 0) return 0
      let x = 0

      for (let i = 0; i < index; i++) {
        x += slotWidth(i, focusIdx) + ITEM_GAP
      }

      x += slotWidth(index, focusIdx) / 2
      return containerWidth / 2 - x
    },
    [slotWidth],
  )

  const centerOnIndex = useCallback(
    (index: number, animateScroll = true) => {
      const offset = getOffsetForIndex(index, index)
      // #region agent log
      debugCoverFlow('H4', 'CoverFlowCarousel.tsx:276', 'centerOnIndex', {
        index,
        offset,
        animateScroll,
        hasInitializedScroll: hasInitializedScroll.current,
        currentScrollX: scrollX.get(),
      })
      // #endregion
      if (!animateScroll || !hasInitializedScroll.current) {
        scrollX.set(offset)
      } else {
        animate(scrollX, offset, scrollTransition)
      }
      hasInitializedScroll.current = true
      return offset
    },
    [getOffsetForIndex, scrollX],
  )

  const findNearestIndex = useCallback(
    (currentX: number) => {
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < books.length; i++) {
        const target = getOffsetForIndex(i, i)
        const dist = Math.abs(target - currentX)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      }
      return best
    },
    [books.length, getOffsetForIndex],
  )

  useEffect(() => {
    // #region agent log
    debugCoverFlow('H7', 'CoverFlowCarousel.tsx:343', 'focus state changed', {
      focusedIndex,
      closingIndex,
      hasCloseTimer: closeTimer.current != null,
      scrollX: scrollX.get(),
    })
    // #endregion
  }, [closingIndex, focusedIndex, scrollX])

  useLayoutEffect(() => {
    if (books.length === 0) return
    if (focusedIndex == null) {
      const initialIndex = findNearestIndex(scrollX.get())
      setFocusedIndex(initialIndex)
      return
    }
    centerOnIndex(focusedIndex, hasInitializedScroll.current)
  }, [books, focusedIndex, centerOnIndex, findNearestIndex, scrollX])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (focusedIndex != null) centerOnIndex(focusedIndex, false)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [focusedIndex, centerOnIndex])

  useEffect(() => {
    return () => {
      if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
      if (suppressReset.current != null) window.clearTimeout(suppressReset.current)
    }
  }, [])

  const requestFocus = useCallback(
    (index: number) => {
      // #region agent log
      debugCoverFlow('H3', 'CoverFlowCarousel.tsx:340', 'requestFocus entry', {
        index,
        focusedIndex,
        closingIndex,
        hasCloseTimer: closeTimer.current != null,
        currentScrollX: scrollX.get(),
      })
      // #endregion
      if (index === focusedIndex && closingIndex == null) return

      if (closeTimer.current != null) {
        window.clearTimeout(closeTimer.current)
        closeTimer.current = null
      }

      const prevFocused = focusedIndex
      setFocusedIndex(index)
      centerOnIndex(index, true)

      if (prevFocused != null && prevFocused !== index) {
        setClosingIndex(prevFocused)
        closeTimer.current = window.setTimeout(() => {
          setClosingIndex(null)
          closeTimer.current = null
        }, TURN_DURATION_MS)
      }
    },
    [centerOnIndex, closingIndex, focusedIndex, scrollX],
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (wheelLock.current) return
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (Math.abs(delta) < 4) return
      wheelLock.current = true
      const current = focusedIndex ?? closingIndex ?? 0
      requestFocus(Math.max(0, Math.min(books.length - 1, current + (delta > 0 ? 1 : -1))))
      window.setTimeout(() => {
        wheelLock.current = false
      }, 380)
    },
    [books.length, closingIndex, focusedIndex, requestFocus],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      const downIndex = Number(
        (e.target instanceof HTMLElement
          ? e.target.closest('[data-coverflow-index]')?.getAttribute('data-coverflow-index')
          : null) ?? NaN,
      )
      pointerDownIndex.current = Number.isFinite(downIndex) ? downIndex : null
      // #region agent log
      debugCoverFlow('H5', 'CoverFlowCarousel.tsx:411', 'container pointer down', {
        clientX: e.clientX,
        clientY: e.clientY,
        target: eventTargetSummary(e.target),
        pointerDownIndex: pointerDownIndex.current,
        focusedIndex,
        closingIndex,
        scrollX: scrollX.get(),
      })
      // #endregion
      if (suppressReset.current != null) {
        window.clearTimeout(suppressReset.current)
        suppressReset.current = null
      }
      scrollX.stop()
      dragSnapshot.current = { x: e.clientX, scrollX: scrollX.get() }
      suppressClick.current = false
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [closingIndex, focusedIndex, scrollX],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const snap = dragSnapshot.current
      if (!snap) return
      const dx = e.clientX - snap.x
      if (Math.abs(dx) > DRAG_THRESHOLD_PX && !suppressClick.current) {
        // #region agent log
        debugCoverFlow('H2', 'CoverFlowCarousel.tsx:429', 'pointer move entered drag suppression', {
          dx,
          startX: snap.x,
          currentX: e.clientX,
          snapScrollX: snap.scrollX,
        })
        // #endregion
        suppressClick.current = true
      }
      if (suppressClick.current) {
        scrollX.set(snap.scrollX + dx)
      }
    },
    [scrollX],
  )

  const handlePointerEnd = useCallback(
    (e: React.PointerEvent) => {
      const snap = dragSnapshot.current
      if (!snap) return
      dragSnapshot.current = null
      // #region agent log
      debugCoverFlow('H5', 'CoverFlowCarousel.tsx:459', 'container pointer end', {
        clientX: e.clientX,
        clientY: e.clientY,
        dx: e.clientX - snap.x,
        suppressClick: suppressClick.current,
        pointerDownIndex: pointerDownIndex.current,
        target: eventTargetSummary(e.target),
        focusedIndex,
        closingIndex,
        scrollX: scrollX.get(),
      })
      // #endregion

      if (suppressClick.current) {
        const nearest = findNearestIndex(scrollX.get())
        // #region agent log
        debugCoverFlow('H2', 'CoverFlowCarousel.tsx:446', 'pointer end suppressed click and snapped', {
          nearest,
          currentScrollX: scrollX.get(),
        })
        // #endregion
        requestFocus(nearest)
        suppressReset.current = window.setTimeout(() => {
          suppressClick.current = false
          suppressReset.current = null
        }, 0)
      } else if (pointerDownIndex.current != null) {
        const targetIndex = pointerDownIndex.current
        // #region agent log
        debugCoverFlow('H5', 'CoverFlowCarousel.tsx:478', 'pointer end activates pressed spine', {
          targetIndex,
          focusedIndex,
          closingIndex,
        })
        // #endregion
        e.preventDefault()
        if (targetIndex === focusedIndex) {
          const book = books[targetIndex]
          if (book) onOpen(book)
        } else {
          requestFocus(targetIndex)
        }
      }
      pointerDownIndex.current = null

      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      }
    },
    [books, closingIndex, findNearestIndex, focusedIndex, onOpen, requestFocus, scrollX],
  )

  const handleSpineFocus = useCallback(
    (index: number) => {
      // #region agent log
      debugCoverFlow('H2', 'CoverFlowCarousel.tsx:467', 'handleSpineFocus entry', {
        index,
        suppressClick: suppressClick.current,
        hasSuppressReset: suppressReset.current != null,
        focusedIndex,
        closingIndex,
      })
      // #endregion
      if (suppressClick.current) {
        suppressClick.current = false
        if (suppressReset.current != null) {
          window.clearTimeout(suppressReset.current)
          suppressReset.current = null
        }
        return
      }
      requestFocus(index)
    },
    [closingIndex, focusedIndex, requestFocus],
  )

  if (books.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center text-libro-muted">
        Import books to see the cover flow
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 cursor-grab overflow-hidden touch-none active:cursor-grabbing"
        onClickCapture={(e) => {
          // #region agent log
          debugCoverFlow('H6', 'CoverFlowCarousel.tsx:544', 'container click capture', {
            target: eventTargetSummary(e.target),
            focusedIndex,
            closingIndex,
            scrollX: scrollX.get(),
          })
          // #endregion
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <motion.div
          className="absolute left-0 top-1/2"
          style={{ x: scrollX }}
        >
          <div
            className="flex -translate-y-1/2 items-end"
            style={{ gap: ITEM_GAP }}
          >
            {books.map((book, i) => {
              const mode: BookMode =
                i === focusedIndex ? 'focused' : i === closingIndex ? 'closing' : 'spine'
              const isActiveBook = mode !== 'spine'
              const coverKey = book.id != null ? String(book.id) : `${book.title}|${book.author}`
              const preset = getSpinePreset(book)
              const fallbackBg = preset.bg
              const fallbackFg = preset.fg
              const isMockBook =
                book.coverSource === 'placeholder' && isSeedPlaceholderBook(book)
              const hasCoverBlob = Boolean(book.coverBlob && book.coverBlob.size > 0)
              const useFallbackCover =
                isMockBook || !hasCoverBlob || failedCovers.has(coverKey)
              const width = slotWidth(i, focusedIndex)
              const visualCoverWidth = bookSize(book).widthPx
              const height = bookSize(book).heightPx
              const spineWidth = Math.max(
                18,
                Math.min(spineWidthPx(book, spineHeightPx(book)), 42),
              )

              return (
                <motion.div
                  key={book.id ?? `${book.title}-${i}`}
                  data-coverflow-index={i}
                  className="relative shrink-0 overflow-visible"
                  style={{ height, zIndex: isActiveBook ? 10 : 1 }}
                  initial={false}
                  animate={{ width }}
                  transition={scrollTransition}
                >
                  <CoverFlowBook
                    book={book}
                    slotWidth={isActiveBook ? visualCoverWidth : spineWidth}
                    coverWidth={visualCoverWidth}
                    height={height}
                    spineWidth={spineWidth}
                    fallbackBg={fallbackBg}
                    fallbackFg={fallbackFg}
                    useFallbackCover={useFallbackCover}
                    mode={mode}
                    onOpen={() => onOpen(book)}
                    onFocus={() => handleSpineFocus(i)}
                    onCoverError={() => {
                      setFailedCovers((prev) => {
                        const next = new Set(prev)
                        next.add(coverKey)
                        return next
                      })
                    }}
                  />
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
