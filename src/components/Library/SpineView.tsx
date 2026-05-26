import { useLayoutEffect, useRef, useState } from 'react'
import type { Book } from '../../types'
import {
  defaultSpineHeight,
  getSpinePreset,
  scaledSpineWidth,
  titleFontSize,
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

function fitTitleFontSize(
  container: HTMLElement,
  titleEl: HTMLElement,
  baseSize: number,
): number {
  const available = Math.max(0, container.clientHeight - 12)
  if (available <= 0) return baseSize

  let size = baseSize
  titleEl.style.fontSize = `${size}px`
  let extent = titleEl.offsetHeight

  while (size > 7 && extent > available) {
    size -= 0.5
    titleEl.style.fontSize = `${size}px`
    extent = titleEl.offsetHeight
  }

  return size
}

function SpineTitle({
  title,
  preset,
  baseSize,
  bookId,
}: {
  title: string
  preset: SpinePreset
  baseSize: number
  bookId?: number
}) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(baseSize)

  useLayoutEffect(() => {
    const container = containerRef.current
    const titleEl = titleRef.current
    if (!container || !titleEl) return

    const measureAndFit = () => {
      titleEl.style.fontSize = `${baseSize}px`
      const fitted = fitTitleFontSize(container, titleEl, baseSize)
      setFontSize(fitted)
    }

    measureAndFit()
    const ro = new ResizeObserver(measureAndFit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [title, baseSize, preset.upper, preset.tracking, bookId])

  const displayTitle = preset.upper ? title.toUpperCase() : title

  return (
    <span
      ref={containerRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-2"
    >
      <span
        ref={titleRef}
        className="whitespace-nowrap"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontSize,
          letterSpacing: preset.upper ? (preset.tracking ?? '1px') : '0.4px',
          textTransform: preset.upper ? 'uppercase' : 'none',
        }}
      >
        {displayTitle}
      </span>
    </span>
  )
}

function SpineAuthor({ author, bookId }: { author: string; bookId?: number }) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(11)

  useLayoutEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return

    const measureAndFit = () => {
      const baseSize = 11
      textEl.style.fontSize = `${baseSize}px`
      const available = Math.max(0, container.clientHeight - 4)
      const extentAtBase = textEl.scrollHeight
      let size = baseSize
      let extent = extentAtBase

      while (size > 8 && extent > available) {
        size -= 0.5
        textEl.style.fontSize = `${size}px`
        extent = textEl.scrollHeight
      }

      setFontSize(size)
    }

    measureAndFit()
    const ro = new ResizeObserver(measureAndFit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [author, bookId])

  return (
    <span
      ref={containerRef}
      className="mt-2 flex min-h-[2.9em] w-full shrink-0 items-end justify-center px-2"
    >
      <span
        ref={textRef}
        className="line-clamp-2 max-w-full break-words text-center leading-snug opacity-60"
        style={{ fontSize }}
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
  const titleSize = titleFontSize(book.title)

  return (
    <div
      data-spine-root
      className={`flex shrink-0 flex-col items-center pb-3 pt-3.5 shadow-none ${className}`}
      style={{
        width: widthPx,
        height: heightPx,
        backgroundColor: preset.bg,
        color: preset.fg,
        fontFamily: preset.font,
      }}
    >
      {showText && (
        <>
          <span className="w-[52%] shrink-0 border-t-[0.5px] border-current opacity-40" />

          <SpineTitle
            title={book.title}
            preset={preset}
            baseSize={titleSize}
            bookId={book.id}
          />

          <span className="w-[52%] shrink-0 border-t-[0.5px] border-current opacity-40" />

          <SpineAuthor author={book.author} bookId={book.id} />
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
