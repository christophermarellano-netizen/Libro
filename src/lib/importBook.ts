import type { DimensionSource } from '../types'
import { db } from '../db'
import { parseEpub, createPlaceholderCover, isValidImageBlob } from './epub'
import * as openLibrary from './openLibrary'
import * as googleBooks from './googleBooks'
import * as amazon from './amazon'
import { fetchCoverBlob, getImageSize } from './googleBooks'
import { extractSpineColors } from './coverColor'
import { dimensionsFromCoverAspect, FORMAT_PRESETS } from './bookDimensions'
import { translateTitleToEnglish } from './titleTranslation'
import type { Book, CoverSource } from '../types'

interface MetadataLookup {
  dimensionSource: DimensionSource
  isbn?: string
  pageCount?: number
  printType?: string
  coverUrl?: string
  physicalHeightMm: number
  physicalWidthMm: number
  physicalThicknessMm: number
  needsCoverRefinement: boolean
}

function hasUsableDims(h?: number, w?: number): boolean {
  return !!(h && w)
}

function estimateThickness(pageCount?: number, existing?: number): number {
  if (existing) return existing
  if (pageCount) return Math.max(8, Math.round(pageCount * 0.1))
  return 20
}

function mergeMatch(base: MetadataLookup, match: {
  isbn?: string
  pageCount?: number
  printType?: string
  coverUrl?: string
  physicalHeightMm?: number
  physicalWidthMm?: number
  physicalThicknessMm?: number
  dimensionSource: DimensionSource
}): MetadataLookup {
  const pageCount = match.pageCount ?? base.pageCount
  const physicalHeightMm = match.physicalHeightMm ?? base.physicalHeightMm
  const physicalWidthMm = match.physicalWidthMm ?? base.physicalWidthMm
  const physicalThicknessMm = estimateThickness(
    pageCount,
    match.physicalThicknessMm ?? base.physicalThicknessMm,
  )

  return {
    dimensionSource: match.dimensionSource,
    isbn: match.isbn ?? base.isbn,
    pageCount,
    printType: match.printType ?? base.printType,
    coverUrl: match.coverUrl ?? base.coverUrl,
    physicalHeightMm,
    physicalWidthMm,
    physicalThicknessMm,
    needsCoverRefinement: !hasUsableDims(physicalHeightMm, physicalWidthMm),
  }
}

function emptyLookup(): MetadataLookup {
  return {
    dimensionSource: 'default',
    physicalHeightMm: FORMAT_PRESETS.paperback.h,
    physicalWidthMm: FORMAT_PRESETS.paperback.w,
    physicalThicknessMm: 20,
    needsCoverRefinement: true,
  }
}

async function lookupEnglishEditionFallback(
  originalTitle: string,
  author: string,
  pageCount?: number,
): Promise<MetadataLookup | null> {
  const englishTitle = await translateTitleToEnglish(originalTitle)
  if (!englishTitle) return null

  let best = emptyLookup()
  best.needsCoverRefinement = true

  const ol = await openLibrary.lookupByEnglishTitle(
    originalTitle,
    englishTitle,
    author,
    pageCount,
  )
  if (ol) {
    best = mergeMatch(best, {
      isbn: ol.isbn,
      pageCount: ol.pageCount ?? pageCount,
      printType: ol.printType,
      coverUrl: ol.coverUrl,
      physicalHeightMm: ol.physicalHeightMm,
      physicalWidthMm: ol.physicalWidthMm,
      physicalThicknessMm: ol.physicalThicknessMm,
      dimensionSource: ol.source,
    })
    if (!best.needsCoverRefinement) return best
  }

  const gb = await googleBooks.lookupByEnglishTitle(
    originalTitle,
    englishTitle,
    author,
    pageCount,
  )
  if (gb) {
    best = mergeMatch(best, {
      isbn: gb.isbn ?? best.isbn,
      pageCount: gb.pageCount ?? best.pageCount,
      printType: gb.printType ?? best.printType,
      coverUrl: gb.coverUrl ?? best.coverUrl,
      physicalHeightMm: gb.physicalHeightMm,
      physicalWidthMm: gb.physicalWidthMm,
      physicalThicknessMm: gb.physicalThicknessMm,
      dimensionSource: gb.physicalHeightMm ? 'google-books-title-en' : best.dimensionSource,
    })
    if (!best.needsCoverRefinement) return best
  }

  const amz = await amazon.lookupByTitleAuthor(englishTitle, author)
  if (amz) {
    best = mergeMatch(best, {
      isbn: amz.isbn ?? best.isbn,
      pageCount: amz.pageCount ?? best.pageCount,
      printType: amz.printType ?? best.printType,
      coverUrl: amz.coverUrl ?? best.coverUrl,
      physicalHeightMm: amz.physicalHeightMm,
      physicalWidthMm: amz.physicalWidthMm,
      physicalThicknessMm: amz.physicalThicknessMm,
      dimensionSource: 'amazon-title-en',
    })
    if (!best.needsCoverRefinement) return best
  }

  const olAuthor = await openLibrary.lookupByAuthorWithTitleHints(
    originalTitle,
    author,
    englishTitle,
    pageCount,
  )
  if (olAuthor) {
    best = mergeMatch(best, {
      isbn: olAuthor.isbn ?? best.isbn,
      pageCount: olAuthor.pageCount ?? best.pageCount,
      printType: olAuthor.printType ?? best.printType,
      coverUrl: olAuthor.coverUrl ?? best.coverUrl,
      physicalHeightMm: olAuthor.physicalHeightMm,
      physicalWidthMm: olAuthor.physicalWidthMm,
      physicalThicknessMm: olAuthor.physicalThicknessMm,
      dimensionSource: olAuthor.physicalHeightMm ? olAuthor.source : best.dimensionSource,
    })
    if (!best.needsCoverRefinement) return best
  }

  const gbAuthor = await googleBooks.lookupByAuthorWithTitleHints(
    originalTitle,
    author,
    englishTitle,
    pageCount,
  )
  if (gbAuthor) {
    best = mergeMatch(best, {
      isbn: gbAuthor.isbn ?? best.isbn,
      pageCount: gbAuthor.pageCount ?? best.pageCount,
      printType: gbAuthor.printType ?? best.printType,
      coverUrl: gbAuthor.coverUrl ?? best.coverUrl,
      physicalHeightMm: gbAuthor.physicalHeightMm,
      physicalWidthMm: gbAuthor.physicalWidthMm,
      physicalThicknessMm: gbAuthor.physicalThicknessMm,
      dimensionSource: gbAuthor.physicalHeightMm ? 'google-books-author' : best.dimensionSource,
    })
  }

  return best.needsCoverRefinement && !best.isbn && !best.pageCount ? null : best
}

async function lookupMetadata(title: string, author: string, isbn?: string, pageCount?: number): Promise<MetadataLookup> {
  let result = emptyLookup()
  if (isbn) result.isbn = isbn

  // 1. Open Library by ISBN
  if (isbn) {
    const ol = await openLibrary.lookupByIsbn(isbn)
    if (ol) {
      result = mergeMatch(result, {
        isbn: ol.isbn ?? isbn,
        pageCount: ol.pageCount,
        printType: ol.printType,
        coverUrl: ol.coverUrl,
        physicalHeightMm: ol.physicalHeightMm,
        physicalWidthMm: ol.physicalWidthMm,
        physicalThicknessMm: ol.physicalThicknessMm,
        dimensionSource: ol.source,
      })
    }
  }

  // 2. Google Books by ISBN (if dimensions still missing)
  if (result.needsCoverRefinement && isbn) {
    const gb = await googleBooks.lookupByIsbn(isbn)
    if (gb) {
      result = mergeMatch(result, {
        isbn: gb.isbn ?? result.isbn,
        pageCount: gb.pageCount ?? result.pageCount,
        printType: gb.printType ?? result.printType,
        coverUrl: gb.coverUrl ?? result.coverUrl,
        physicalHeightMm: gb.physicalHeightMm,
        physicalWidthMm: gb.physicalWidthMm,
        physicalThicknessMm: gb.physicalThicknessMm,
        dimensionSource: gb.physicalHeightMm ? 'google-books-isbn' : result.dimensionSource,
      })
    }
  }

  // 3. Amazon by ISBN (optional, if credentials configured)
  if (result.needsCoverRefinement && (isbn || result.isbn)) {
    const amz = await amazon.lookupByIsbn(isbn ?? result.isbn!)
    if (amz) {
      result = mergeMatch(result, {
        isbn: amz.isbn ?? result.isbn,
        pageCount: amz.pageCount ?? result.pageCount,
        printType: amz.printType ?? result.printType,
        coverUrl: amz.coverUrl ?? result.coverUrl,
        physicalHeightMm: amz.physicalHeightMm,
        physicalWidthMm: amz.physicalWidthMm,
        physicalThicknessMm: amz.physicalThicknessMm,
        dimensionSource: 'amazon-isbn',
      })
    }
  }

  // 4. Open Library by title + author
  if (result.needsCoverRefinement) {
    const ol = await openLibrary.lookupByTitleAuthor(title, author)
    if (ol) {
      result = mergeMatch(result, {
        isbn: ol.isbn ?? result.isbn,
        pageCount: ol.pageCount ?? result.pageCount,
        printType: ol.printType ?? result.printType,
        coverUrl: ol.coverUrl ?? result.coverUrl,
        physicalHeightMm: ol.physicalHeightMm,
        physicalWidthMm: ol.physicalWidthMm,
        physicalThicknessMm: ol.physicalThicknessMm,
        dimensionSource: ol.physicalHeightMm ? ol.source : result.dimensionSource,
      })
    }
  }

  // 5. Google Books by title + author
  if (result.needsCoverRefinement) {
    const gb = await googleBooks.lookupByTitleAuthor(title, author)
    if (gb) {
      result = mergeMatch(result, {
        isbn: gb.isbn ?? result.isbn,
        pageCount: gb.pageCount ?? result.pageCount,
        printType: gb.printType ?? result.printType,
        coverUrl: gb.coverUrl ?? result.coverUrl,
        physicalHeightMm: gb.physicalHeightMm,
        physicalWidthMm: gb.physicalWidthMm,
        physicalThicknessMm: gb.physicalThicknessMm,
        dimensionSource: gb.physicalHeightMm ? 'google-books-title' : result.dimensionSource,
      })
    }
  }

  // 6. Amazon by title + author
  if (result.needsCoverRefinement) {
    const amz = await amazon.lookupByTitleAuthor(title, author)
    if (amz) {
      result = mergeMatch(result, {
        isbn: amz.isbn ?? result.isbn,
        pageCount: amz.pageCount ?? result.pageCount,
        printType: amz.printType ?? result.printType,
        coverUrl: amz.coverUrl ?? result.coverUrl,
        physicalHeightMm: amz.physicalHeightMm,
        physicalWidthMm: amz.physicalWidthMm,
        physicalThicknessMm: amz.physicalThicknessMm,
        dimensionSource: 'amazon-title',
      })
    }
  }

  // 7. English title translation + author (Spanish editions → original-language catalog)
  if (result.needsCoverRefinement) {
    const english = await lookupEnglishEditionFallback(
      title,
      author,
      result.pageCount ?? pageCount,
    )
    if (english) {
      result = mergeMatch(result, {
        isbn: english.isbn ?? result.isbn,
        pageCount: english.pageCount ?? result.pageCount,
        printType: english.printType ?? result.printType,
        coverUrl: english.coverUrl ?? result.coverUrl,
        physicalHeightMm: english.physicalHeightMm,
        physicalWidthMm: english.physicalWidthMm,
        physicalThicknessMm: english.physicalThicknessMm,
        dimensionSource: english.dimensionSource,
      })
    }
  }

  return result
}

async function resolveCover(
  embeddedCover: Blob | undefined,
  _embeddedSize: { width?: number; height?: number },
  onlineCoverUrl: string | undefined,
  isbn: string | undefined,
  title: string,
): Promise<{ coverBlob: Blob; coverSource: CoverSource }> {
  // Always keep the cover bundled with the user's EPUB when present.
  if (embeddedCover && embeddedCover.size > 0) {
    return { coverBlob: embeddedCover, coverSource: 'epub' }
  }

  if (onlineCoverUrl) {
    const blob = await fetchCoverBlob(onlineCoverUrl)
    if (blob) {
      const source: CoverSource = onlineCoverUrl.includes('openlibrary')
        ? 'open-library'
        : 'google-books'
      return { coverBlob: blob, coverSource: source }
    }
  }

  if (isbn) {
    const olUrl = openLibrary.getOpenLibraryCoverUrl(isbn)
    const blob = await fetchCoverBlob(olUrl)
    if (blob) return { coverBlob: blob, coverSource: 'open-library' }
  }

  const placeholder = await createPlaceholderCover(title)
  return { coverBlob: placeholder, coverSource: 'placeholder' }
}

async function refineDimensionsFromCover(
  coverBlob: Blob,
  pageCount?: number,
  printType?: string,
): Promise<{
  physicalHeightMm: number
  physicalWidthMm: number
  physicalThicknessMm: number
  dimensionSource: DimensionSource
}> {
  try {
    const size = await getImageSize(coverBlob)
    const aspect = size.width / size.height
    return dimensionsFromCoverAspect(aspect, pageCount, printType)
  } catch {
    return {
      physicalHeightMm: FORMAT_PRESETS.paperback.h,
      physicalWidthMm: FORMAT_PRESETS.paperback.w,
      physicalThicknessMm: pageCount ? Math.max(8, Math.round(pageCount * 0.1)) : 20,
      dimensionSource: 'default',
    }
  }
}

export async function importEpubFile(file: File): Promise<Omit<Book, 'id'>> {
  const epubBlob = file.slice(0, file.size, 'application/epub+zip')
  const meta = await parseEpub(epubBlob)

  let coverBlob: Blob
  let coverSource: CoverSource

  if (meta.coverBlob && (await isValidImageBlob(meta.coverBlob))) {
    coverBlob = meta.coverBlob
    coverSource = 'epub'
  } else {
    const resolved = await resolveCover(
      undefined,
      {},
      undefined,
      meta.isbn,
      meta.title,
    )
    coverBlob = resolved.coverBlob
    coverSource = resolved.coverSource
  }

  const refined = await refineDimensionsFromCover(
    coverBlob,
    meta.pageCount,
    undefined,
  )

  const { spineColorHex, spineTextColorHex } = await extractSpineColors(coverBlob)

  return {
    title: meta.title,
    author: meta.author,
    epubBlob,
    coverBlob,
    coverSource,
    isbn: meta.isbn,
    pageCount: meta.pageCount,
    physicalHeightMm: refined.physicalHeightMm,
    physicalWidthMm: refined.physicalWidthMm,
    physicalThicknessMm: refined.physicalThicknessMm,
    dimensionSource: refined.dimensionSource,
    spineColorHex,
    spineTextColorHex,
    addedAt: Date.now(),
  }
}

export async function enrichImportedBook(bookId: number): Promise<void> {
  const book = await db.books.get(bookId)
  if (!book) return

  const updates: Partial<Book> = {}

  try {
    const meta = await parseEpub(book.epubBlob)
    if (meta.coverBlob && (await isValidImageBlob(meta.coverBlob))) {
      updates.coverBlob = meta.coverBlob
      updates.coverSource = 'epub'
      const colors = await extractSpineColors(meta.coverBlob)
      updates.spineColorHex = colors.spineColorHex
      updates.spineTextColorHex = colors.spineTextColorHex
    }
  } catch {
    // Keep the existing cover if the EPUB cannot be re-read.
  }

  const lookup = await lookupMetadata(
    book.title,
    book.author,
    book.isbn,
    book.pageCount,
  )

  updates.isbn = lookup.isbn ?? book.isbn
  updates.pageCount = lookup.pageCount ?? book.pageCount
  updates.printType = lookup.printType

  const coverForDims = updates.coverBlob ?? book.coverBlob
  if (lookup.needsCoverRefinement) {
    const refined = await refineDimensionsFromCover(
      coverForDims,
      updates.pageCount ?? book.pageCount,
      updates.printType ?? book.printType,
    )
    Object.assign(updates, refined)
  } else {
    updates.physicalHeightMm = lookup.physicalHeightMm
    updates.physicalWidthMm = lookup.physicalWidthMm
    updates.physicalThicknessMm = lookup.physicalThicknessMm
    updates.dimensionSource = lookup.dimensionSource
  }

  await db.books.update(bookId, { ...updates, syncUpdatedAt: Date.now() })
  const { scheduleBookUpload } = await import('../lib/sync')
  scheduleBookUpload(bookId)
}

export async function refreshBookDimensions(book: Book): Promise<Partial<Book>> {
  const lookup = await lookupMetadata(book.title, book.author, book.isbn, book.pageCount)

  if (lookup.needsCoverRefinement) {
    const refined = await refineDimensionsFromCover(
      book.coverBlob,
      lookup.pageCount ?? book.pageCount,
      lookup.printType ?? book.printType,
    )
    return {
      isbn: lookup.isbn ?? book.isbn,
      pageCount: lookup.pageCount ?? book.pageCount,
      printType: lookup.printType ?? book.printType,
      physicalHeightMm: refined.physicalHeightMm,
      physicalWidthMm: refined.physicalWidthMm,
      physicalThicknessMm: refined.physicalThicknessMm,
      dimensionSource: refined.dimensionSource,
    }
  }

  return {
    isbn: lookup.isbn ?? book.isbn,
    pageCount: lookup.pageCount ?? book.pageCount,
    printType: lookup.printType ?? book.printType,
    physicalHeightMm: lookup.physicalHeightMm,
    physicalWidthMm: lookup.physicalWidthMm,
    physicalThicknessMm: lookup.physicalThicknessMm,
    dimensionSource: lookup.dimensionSource,
  }
}
