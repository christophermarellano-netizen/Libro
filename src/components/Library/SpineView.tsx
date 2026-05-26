import { useLayoutEffect, useRef, useState } from 'react'
import type { Book } from '../../types'
import {
  defaultSpineHeight,
  getSpinePreset,
  scaledSpineWidth,
  type SpinePreset,
} from '../../lib/spinePresets'

interface SpineViewProps {
  book: Book
  heightPx: number
  widthPx?: number
  showText?: boolean
  onClick?: () => void
  className?: string
}

const TITLE_MIN_PX = 5
const AUTHOR_MIN_PX = 4
const MAX_TITLE_FONT_PX = 100
const FIT_SAFETY_PX = 2
const SPINE_TEXT_INSET_PX = 4

function fitsTitleInBox(
  textEl: HTMLElement,
  maxWidth: number,
  maxHeight: number,
): boolean {
  const { width, height } = textEl.getBoundingClientRect()
  return (
    width <= maxWidth - FIT_SAFETY_PX &&
    height <= maxHeight - FIT_SAFETY_PX
  )
}

function fitsAuthorInBox(
  textEl: HTMLElement,
  maxWidth: number,
  maxHeight: number,
): boolean {
  return (
    textEl.scrollWidth <= maxWidth - FIT_SAFETY_PX &&
    textEl.scrollHeight <= maxHeight - FIT_SAFETY_PX
  )
}

function binarySearchFontSize(
  textEl: HTMLElement,
  maxWidth: number,
  maxHeight: number,
  minSize: number,
  maxSize: number,
  fits: (el: HTMLElement, w: number, h: number) => boolean,
): number {
  if (maxWidth <= 0 || maxHeight <= 0) return minSize

  textEl.style.fontSize = `${maxSize}px`
  if (fits(textEl, maxWidth, maxHeight)) return maxSize

  let lo = minSize
  let hi = maxSize
  for (let i = 0; i < 24; i++) {
    if (hi - lo < 0.2) break
    const mid = (lo + hi) / 2
    textEl.style.fontSize = `${mid}px`
    if (fits(textEl, maxWidth, maxHeight)) {
      lo = mid
    } else {
      hi = mid
    }
  }

  return Math.max(minSize, Math.round(lo * 10) / 10)
}

function SpineTitle({
  title,
  preset,
  bookId,
}: {
  title: string
  preset: SpinePreset
  bookId?: number
}) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState<number | null>(null)

  const displayTitle = preset.upper ? title.toUpperCase() : title

  useLayoutEffect(() => {
    const container = containerRef.current
    const titleEl = titleRef.current
    if (!container || !titleEl) return

    const measureAndFit = () => {
      if (container.clientWidth <= 0 || container.clientHeight <= 0) return
      const fitted = binarySearchFontSize(
        titleEl,
        container.clientWidth,
        container.clientHeight,
        TITLE_MIN_PX,
        MAX_TITLE_FONT_PX,
        fitsTitleInBox,
      )
      titleEl.style.fontSize = `${fitted}px`
      setFontSize(fitted)
    }

    measureAndFit()
    const ro = new ResizeObserver(measureAndFit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [title, preset.upper, preset.tracking, bookId, displayTitle, preset])

  return (
    <span
      ref={containerRef}
      className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden"
      style={{ paddingInline: SPINE_TEXT_INSET_PX }}
    >
      <span
        ref={titleRef}
        className="whitespace-nowrap"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontSize: fontSize ?? TITLE_MIN_PX,
          visibility: fontSize == null ? 'hidden' : 'visible',
          letterSpacing: preset.upper ? (preset.tracking ?? '1px') : '0.35px',
          textTransform: preset.upper ? 'uppercase' : 'none',
          lineHeight: 1.05,
        }}
      >
        {displayTitle}
      </span>
    </span>
  )
}

function SpineAuthor({
  author,
  bookId,
}: {
  author: string
  bookId?: number
}) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState<number | null>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return

    const measureAndFit = () => {
      if (container.clientWidth <= 0 || container.clientHeight <= 0) return
      const availableWidth = container.clientWidth
      const availableHeight = container.clientHeight
      textEl.style.maxWidth = `${availableWidth}px`
      textEl.style.display = 'block'

      const maxAuthorSize = Math.min(
        availableHeight * 0.72,
        availableWidth * 0.95,
        11,
      )

      const fitted = binarySearchFontSize(
        textEl,
        availableWidth,
        availableHeight,
        AUTHOR_MIN_PX,
        Math.max(AUTHOR_MIN_PX, maxAuthorSize),
        fitsAuthorInBox,
      )
      textEl.style.fontSize = `${fitted}px`
      setFontSize(fitted)
    }

    measureAndFit()
    const ro = new ResizeObserver(measureAndFit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [author, bookId])

  return (
    <span
      ref={containerRef}
      className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden"
      style={{ paddingInline: SPINE_TEXT_INSET_PX }}
    >
      <span
        ref={textRef}
        className="mx-auto block text-center opacity-60"
        style={{
          fontSize: fontSize ?? AUTHOR_MIN_PX,
          visibility: fontSize == null ? 'hidden' : 'visible',
          lineHeight: 1.1,
          wordBreak: 'normal',
          overflowWrap: 'normal',
          hyphens: 'none',
          WebkitHyphens: 'none',
        }}
      >
        {author}
      </span>
    </span>
  )
}

function SpineContent({
  book,
  heightPx,
  widthPx,
  showText,
  className,
}: {
  book: Book
  heightPx: number
  widthPx: number
  showText: boolean
  className: string
}) {
  const preset = getSpinePreset(book)
  const topPad = Math.max(4, Math.round(heightPx * 0.025))
  const bottomPad = Math.max(3, Math.round(heightPx * 0.018))
  const ornamentH = 1
  const titleFlex = 4
  const authorFlex = 1
  const titleZoneHeight = Math.max(
    0,
    heightPx - topPad - bottomPad - ornamentH * 2 - 4,
  )
  const authorZoneHeight = (titleZoneHeight * authorFlex) / (titleFlex + authorFlex)
  const computedTitleZoneHeight = titleZoneHeight - authorZoneHeight

  return (
    <div
      data-spine-root
      className={`flex shrink-0 flex-col items-center overflow-hidden shadow-none ${className}`}
      style={{
        width: widthPx,
        height: heightPx,
        backgroundColor: preset.bg,
        color: preset.fg,
        fontFamily: preset.font,
        paddingTop: topPad,
        paddingBottom: bottomPad,
      }}
    >
      {showText && (
        <>
          <span className="mb-1 w-[52%] shrink-0 border-t-[0.5px] border-current opacity-40" />

          <div
            className="flex w-full flex-col items-center overflow-hidden"
            style={{ height: computedTitleZoneHeight, minHeight: 0 }}
          >
            <SpineTitle title={book.title} preset={preset} bookId={book.id} />
          </div>

          <span className="my-0.5 w-[52%] shrink-0 border-t-[0.5px] border-current opacity-40" />

          <div
            className="flex w-full flex-col items-center overflow-hidden"
            style={{ height: authorZoneHeight, minHeight: 0 }}
          >
            <SpineAuthor author={book.author} bookId={book.id} />
          </div>
        </>
      )}
    </div>
  )
}

export function SpineView({
  book,
  heightPx,
  widthPx: widthOverride,
  showText = true,
  onClick,
  className = '',
}: SpineViewProps) {
  const widthPx = widthOverride ?? scaledSpineWidth(book, heightPx)

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${book.title} by ${book.author}`}
        className="cursor-pointer border-0 bg-transparent p-0"
      >
        <SpineContent
          book={book}
          heightPx={heightPx}
          widthPx={widthPx}
          showText={showText}
          className={className}
        />
      </button>
    )
  }

  return (
    <SpineContent
      book={book}
      heightPx={heightPx}
      widthPx={widthPx}
      showText={showText}
      className={className}
    />
  )
}

export function spineWidthPx(book: Book, heightPx: number): number {
  return scaledSpineWidth(book, heightPx)
}

export function totalShelfWidth(books: Book[], scale: number, gap = 4): number {
  if (books.length === 0) return 0
  return books.reduce((sum, book, index) => {
    const heightPx = Math.round(defaultSpineHeight(book) * scale)
    const width = scaledSpineWidth(book, heightPx)
    return sum + width + (index > 0 ? gap : 0)
  }, 0)
}
