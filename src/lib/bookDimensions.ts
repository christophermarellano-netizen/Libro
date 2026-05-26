import type { DimensionSource } from '../types'

export const FORMAT_PRESETS = {
  hardcover: { h: 234, w: 156 },
  paperback: { h: 178, w: 111 },
  pocket: { h: 171, w: 105 },
  trade: { h: 198, w: 129 },
} as const

export function inferFormatFromCoverAspect(aspect: number): keyof typeof FORMAT_PRESETS {
  // width / height — wider covers suggest larger trim sizes
  if (aspect >= 0.72) return 'hardcover'
  if (aspect >= 0.66) return 'trade'
  if (aspect <= 0.58) return 'pocket'
  return 'paperback'
}

export function inferHeightFromSignals(
  pageCount?: number,
  printType?: string,
  coverAspect?: number,
): number {
  if (coverAspect && coverAspect > 0) {
    const format = inferFormatFromCoverAspect(coverAspect)
    let height = FORMAT_PRESETS[format].h
    if (pageCount && pageCount > 500 && format === 'paperback') {
      height = FORMAT_PRESETS.hardcover.h
    }
    return height
  }

  if (printType?.toUpperCase().includes('MAGAZINE')) {
    return FORMAT_PRESETS.pocket.h
  }

  if (pageCount && pageCount > 600) return FORMAT_PRESETS.hardcover.h
  if (pageCount && pageCount > 400) return FORMAT_PRESETS.trade.h
  return FORMAT_PRESETS.paperback.h
}

export function dimensionsFromCoverAspect(
  coverAspect: number,
  pageCount?: number,
  printType?: string,
): {
  physicalHeightMm: number
  physicalWidthMm: number
  physicalThicknessMm: number
  dimensionSource: DimensionSource
} {
  const physicalHeightMm = inferHeightFromSignals(pageCount, printType, coverAspect)
  const physicalWidthMm = Math.round(physicalHeightMm * coverAspect)
  const physicalThicknessMm = pageCount
    ? Math.max(8, Math.round(pageCount * 0.1))
    : 20

  return {
    physicalHeightMm,
    physicalWidthMm,
    physicalThicknessMm,
    dimensionSource: 'inferred',
  }
}

export function thicknessFromPageCount(pageCount: number): number {
  return Math.max(8, Math.round(pageCount * 0.1))
}

export function formatForPageCount(pageCount: number): keyof typeof FORMAT_PRESETS {
  if (pageCount >= 550) return 'hardcover'
  if (pageCount >= 350) return 'trade'
  if (pageCount <= 160) return 'pocket'
  return 'paperback'
}

export function dimensionsFromPageCount(pageCount: number): {
  physicalHeightMm: number
  physicalWidthMm: number
  physicalThicknessMm: number
} {
  const format = formatForPageCount(pageCount)
  const { h, w } = FORMAT_PRESETS[format]
  return {
    physicalHeightMm: h,
    physicalWidthMm: w,
    physicalThicknessMm: thicknessFromPageCount(pageCount),
  }
}

/** Scale factor so the tallest book renders at `targetTallestPx`. */
export function libraryDisplayScale(
  books: Array<{ physicalHeightMm: number }>,
  targetTallestPx = 220,
): number {
  if (books.length === 0) return 1
  const maxHeightMm = Math.max(...books.map((b) => b.physicalHeightMm), 1)
  return targetTallestPx / maxHeightMm
}

export function displaySizePx(
  book: { physicalHeightMm: number; physicalWidthMm: number },
  scale: number,
): { widthPx: number; heightPx: number } {
  return {
    heightPx: Math.round(book.physicalHeightMm * scale),
    widthPx: Math.round(book.physicalWidthMm * scale),
  }
}
