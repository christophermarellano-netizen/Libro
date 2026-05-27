import type { Book } from '../types'
import { bookHeightMm, spineThicknessMm } from './bookDimensions'

export interface SpinePreset {
  font: string
  bg: string
  fg: string
  upper?: boolean
  tracking?: string
}

export const SPINE_PRESETS: SpinePreset[] = [
  { font: "'Fraunces', Georgia, serif", bg: '#0F6E56', fg: '#F5EFE4' },
  { font: "'EB Garamond', Georgia, serif", bg: '#ECE6D8', fg: '#4A1B0C' },
  { font: "'Inter', system-ui, sans-serif", bg: '#185FA5', fg: '#FFFFFF' },
  { font: "'Space Grotesk', system-ui, sans-serif", bg: '#2C2C2A', fg: '#F1EFE8' },
  { font: "'Oswald', 'Arial Narrow', sans-serif", bg: '#993C1D', fg: '#FAECE7' },
  { font: "'Bitter', Rockwell, Georgia, serif", bg: '#791F1F', fg: '#FCEBEB' },
  { font: "'Space Mono', ui-monospace, monospace", bg: '#854F0B', fg: '#FAEEDA' },
  {
    font: "'Archivo Black', 'Helvetica Neue', Arial, sans-serif",
    bg: '#F1EFE8',
    fg: '#2C2C2A',
    upper: true,
    tracking: '1px',
  },
  { font: "'Instrument Serif', Georgia, serif", bg: '#FBEAF0', fg: '#72243E' },
  {
    font: "'Bricolage Grotesque', 'Helvetica Neue', Arial, sans-serif",
    bg: '#173404',
    fg: '#C0DD97',
  },
  { font: "'Syne', 'Helvetica Neue', Arial, sans-serif", bg: '#3C3489', fg: '#CECBF6' },
]

export function spineHashKey(book: Pick<Book, 'id' | 'title' | 'author'>): string {
  return book.id !== undefined ? String(book.id) : `${book.title}|${book.author}`
}

export function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) + h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function getSpinePreset(book: Pick<Book, 'id' | 'title' | 'author' | 'presetIndex'>): SpinePreset {
  if (book.presetIndex != null) {
    return SPINE_PRESETS[book.presetIndex % SPINE_PRESETS.length]
  }
  const h = hashString(spineHashKey(book))
  return SPINE_PRESETS[h % SPINE_PRESETS.length]
}

export function defaultSpineHeight(book: Pick<Book, 'id' | 'title' | 'author'>): number {
  const h = hashString(spineHashKey(book))
  return 232 + ((h >> 4) % 27)
}

export function defaultSpineWidth(book: Pick<Book, 'id' | 'title' | 'author'>): number {
  const h = hashString(spineHashKey(book))
  return 52 + (h % 17)
}

export function titleFontSize(title: string): number {
  const len = title.length
  if (len > 24) return 14
  if (len > 18) return 15
  return 17
}

export function scaledSpineWidth(book: Book, heightPx: number): number {
  const heightMm = bookHeightMm(book)
  const thicknessMm = spineThicknessMm(book)
  const widthPx = Math.round(thicknessMm * (heightPx / heightMm))
  return Math.max(6, Math.min(56, widthPx))
}

export function spineDisplayScale(
  books: Array<Pick<Book, 'id' | 'title' | 'author'>>,
  targetTallestPx = 258,
): number {
  if (books.length === 0) return 1
  const maxHeight = Math.max(...books.map(defaultSpineHeight), 1)
  return targetTallestPx / maxHeight
}

export function scaledSpineHeight(
  book: Pick<Book, 'id' | 'title' | 'author'>,
  scale: number,
): number {
  return Math.round(defaultSpineHeight(book) * scale)
}
