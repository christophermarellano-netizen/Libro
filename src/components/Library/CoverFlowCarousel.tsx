import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion'
import type { Book } from '../../types'
import { displaySizePx, libraryDisplayScale } from '../../lib/bookDimensions'
import { getSpinePreset } from '../../lib/spinePresets'
import { SpineView, spineWidthPx } from './SpineView'

interface CoverFlowCarouselProps {
  books: Book[]
  onOpen: (book: Book) => void
}

const ROW_TARGET_HEIGHT = 300
const ITEM_GAP = 4
const TURN_CLEARANCE = 56
const TURN_DURATION_MS = 460
const FOCUS_OVERLAP_DELAY_MS = 140
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
      'X-Debug-Session-Id': 'fc02e7',
    },
    body: JSON.stringify({
      sessionId: 'fc02e7',
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
  coverSrc,
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
  coverSrc: string
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
      <div
        className="absolute bottom-0 left-0"
        style={{ visibility: isActiveBook ? 'hidden' : 'visible' }}
      >
        <SpineView
          book={book}
          heightPx={height}
          widthPx={sideWidth}
          showText
          className="shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
        />
      </div>

      {isActiveBook && (
        <motion.div
          className="absolute bottom-0 left-0 shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
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
          {useFallbackCover ? (
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
        </motion.div>
      )}

      {isActiveBook && (
        <motion.div
          className="absolute bottom-0 left-0 top-0 overflow-hidden shadow-[-6px_0_14px_rgba(0,0,0,0.16)_inset]"
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
            showText
            className="shadow-[-6px_0_14px_rgba(0,0,0,0.16)_inset]"
          />
        </motion.div>
      )}
    </motion.button>
  )
}

export function CoverFlowCarousel({ books, onOpen }: CoverFlowCarouselProps) {
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
  const focusTimer = useRef<number | null>(null)
  const pendingFocusIndex = useRef<number | null>(null)
  const hasInitializedScroll = useRef(false)

  const activeCoverIndex = focusedIndex ?? closingIndex
  const focusedBook =
    activeCoverIndex == null ? null : books[activeCoverIndex]
  const rowScale = useMemo(
    () => libraryDisplayScale(books, ROW_TARGET_HEIGHT),
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

  const coverUrls = useMemo(() => {
    const urls = new Map<number, string>()
    books.forEach((book) => {
      if (book.id !== undefined && book.coverBlob) {
        urls.set(book.id, URL.createObjectURL(book.coverBlob))
      }
    })
    return urls
  }, [books])

  useEffect(() => {
    return () => {
      coverUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [coverUrls])

  const slotWidth = useCallback(
    (index: number, focusIdx: number | null, closeIdx: number | null = null) => {
      const book = books[index]
      const spineSlotWidth = Math.max(18, Math.min(spineWidthPx(book, spineHeightPx(book)), 42))

      if (index === focusIdx) {
        return bookSize(book).widthPx + TURN_CLEARANCE * 2
      }

      if (index === closeIdx) {
        return TURN_CLEARANCE
      }

      return spineSlotWidth
    },
    [books, bookSize, spineHeightPx],
  )

  const getOffsetForIndex = useCallback(
    (index: number, focusIdx: number, closeIdx: number | null = null) => {
      if (!containerRef.current) return 0
      const containerWidth = containerRef.current.offsetWidth
      if (containerWidth === 0) return 0
      let x = 0

      for (let i = 0; i < index; i++) {
        x += slotWidth(i, focusIdx, closeIdx) + ITEM_GAP
      }

      x += slotWidth(index, focusIdx, closeIdx) / 2
      return containerWidth / 2 - x
    },
    [slotWidth],
  )

  const centerOnIndex = useCallback(
    (index: number, animateScroll = true) => {
      const offset = getOffsetForIndex(index, index)
      // #region agent log
      debugCoverFlow('H4', 'CoverFlowCarousel.tsx:276', 'centerOnIndex computed offset', {
        index,
        offset,
        animateScroll,
        hasInitializedScroll: hasInitializedScroll.current,
        focusedIndex,
        closingIndex,
        containerWidth: containerRef.current?.offsetWidth ?? null,
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
    [closingIndex, focusedIndex, getOffsetForIndex, scrollX],
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
      pendingFocusIndex: pendingFocusIndex.current,
      hasCloseTimer: closeTimer.current != null,
      hasFocusTimer: focusTimer.current != null,
      scrollX: scrollX.get(),
    })
    // #endregion
  }, [closingIndex, focusedIndex, scrollX])

  useLayoutEffect(() => {
    if (books.length === 0) return
    if (focusedIndex == null && closingIndex == null) {
      const initialIndex = findNearestIndex(scrollX.get())
      setFocusedIndex(initialIndex)
      return
    }
    if (focusedIndex == null) return
    centerOnIndex(focusedIndex, hasInitializedScroll.current)
  }, [books, focusedIndex, closingIndex, centerOnIndex, findNearestIndex, scrollX])

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
      if (focusTimer.current != null) window.clearTimeout(focusTimer.current)
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
        hasFocusTimer: focusTimer.current != null,
        pendingFocusIndex: pendingFocusIndex.current,
        currentScrollX: scrollX.get(),
      })
      // #endregion
      if (index === focusedIndex && closingIndex == null) return
      centerOnIndex(index, true)

      if (closeTimer.current != null) {
        // #region agent log
        debugCoverFlow('H3', 'CoverFlowCarousel.tsx:355', 'requestFocus deferred during close timer', {
          index,
          focusedIndex,
          closingIndex,
        })
        // #endregion
        pendingFocusIndex.current = index
        if (focusedIndex != null && focusedIndex !== index) {
          setFocusedIndex(index)
        }
        return
      }

      if (focusedIndex != null && focusedIndex !== index) {
        // #region agent log
        debugCoverFlow('H3', 'CoverFlowCarousel.tsx:367', 'requestFocus starts close-open sequence', {
          index,
          previousFocusedIndex: focusedIndex,
          closingIndex,
        })
        // #endregion
        setClosingIndex(focusedIndex)
        setFocusedIndex(null)
        pendingFocusIndex.current = index
        focusTimer.current = window.setTimeout(() => {
          const nextIndex = pendingFocusIndex.current ?? index
          // #region agent log
          debugCoverFlow('H8', 'CoverFlowCarousel.tsx:435', 'focus timer fires', {
            nextIndex,
            closingIndex: focusedIndex,
            scrollX: scrollX.get(),
          })
          // #endregion
          setFocusedIndex(nextIndex)
          pendingFocusIndex.current = null
          focusTimer.current = null
        }, FOCUS_OVERLAP_DELAY_MS)
        closeTimer.current = window.setTimeout(() => {
          // #region agent log
          debugCoverFlow('H7', 'CoverFlowCarousel.tsx:446', 'close timer clears closing index', {
            closingIndex: focusedIndex,
            pendingFocusIndex: pendingFocusIndex.current,
            scrollX: scrollX.get(),
          })
          // #endregion
          setClosingIndex(null)
          closeTimer.current = null
        }, TURN_DURATION_MS)
        return
      }

      setFocusedIndex(index)
      // #region agent log
      debugCoverFlow('H3', 'CoverFlowCarousel.tsx:388', 'requestFocus sets focused immediately', {
        index,
        closingIndex,
      })
      // #endregion
      pendingFocusIndex.current = null
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
      <div className="flex flex-1 items-center justify-center text-libro-muted">
        Import books to see the cover flow
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-6 text-center">
        {focusedBook ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={focusedBook.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-semibold">{focusedBook.title}</h2>
              <p className="text-sm text-libro-muted">{focusedBook.author}</p>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div>
            <h2 className="text-lg font-semibold">Select a book</h2>
            <p className="text-sm text-libro-muted">
              Click a spine to center it and show its cover
            </p>
          </div>
        )}
      </div>

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
              const coverSrc =
                book.id !== undefined ? coverUrls.get(book.id) ?? '' : ''
              const preset = getSpinePreset(book)
              const fallbackBg = preset.bg
              const fallbackFg = preset.fg
              const useFallbackCover =
                book.coverSource === 'placeholder' ||
                coverSrc === '' ||
                failedCovers.has(coverKey)
              const width = slotWidth(i, focusedIndex, closingIndex)
              const visualCoverWidth = bookSize(book).widthPx
              const height = bookSize(book).heightPx
              const spineWidth = Math.max(
                18,
                Math.min(spineWidthPx(book, spineHeightPx(book)), 42),
              )
              const closingWidthKeyframes = [
                visualCoverWidth + TURN_CLEARANCE * 2,
                visualCoverWidth + TURN_CLEARANCE,
                Math.round(visualCoverWidth * 0.74) + TURN_CLEARANCE,
                Math.round(visualCoverWidth * 0.36) + TURN_CLEARANCE,
                TURN_CLEARANCE,
              ]
              if (mode !== 'spine') {
                // #region agent log
                debugCoverFlow('H9', 'CoverFlowCarousel.tsx:593', 'active item render targets', {
                  index: i,
                  mode,
                  width,
                  slotWidth: isActiveBook ? visualCoverWidth : spineWidth,
                  visualCoverWidth,
                  spineWidth,
                  closingWidthKeyframes: mode === 'closing' ? closingWidthKeyframes : null,
                  focusedIndex,
                  closingIndex,
                })
                // #endregion
              }

              return (
                <motion.div
                  key={book.id ?? `${book.title}-${i}`}
                  data-coverflow-index={i}
                  className="relative shrink-0 overflow-visible"
                  style={{ height, zIndex: isActiveBook ? 10 : 1 }}
                  initial={false}
                  animate={{ width: mode === 'closing' ? closingWidthKeyframes : width }}
                  transition={mode === 'closing' ? closeTurnTransition : turnTransition}
                >
                  <CoverFlowBook
                    book={book}
                    coverSrc={coverSrc}
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
