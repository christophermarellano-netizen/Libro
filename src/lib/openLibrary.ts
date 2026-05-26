import {
  pageCountSimilarity,
  primaryAuthor,
  similarity,
  titleMatchScore,
} from './textMatch'

export interface OpenLibraryMatch {
  isbn?: string
  pageCount?: number
  printType?: string
  physicalHeightMm?: number
  physicalWidthMm?: number
  physicalThicknessMm?: number
  coverUrl?: string
  confidence: number
  source:
    | 'open-library-isbn'
    | 'open-library-title'
    | 'open-library-title-en'
    | 'open-library-author'
}

interface OpenLibraryDetails {
  number_of_pages?: number
  physical_format?: string
  physical_dimensions?: string
  isbn_13?: string[]
  isbn_10?: string[]
  cover?: {
    large?: string
    medium?: string
    small?: string
  }
  title?: string
}

interface OpenLibrarySearchDoc {
  key?: string
  title?: string
  author_name?: string[]
  isbn?: string[]
  cover_edition_key?: string
  number_of_pages_median?: number
}

function inchesToMm(inches: number): number {
  return Math.round(inches * 25.4)
}

function cmToMm(cm: number): number {
  return Math.round(cm * 10)
}

/** Parse strings like "8.1 x 5.5 x 1.1 inches" or "21 x 14 x 2 cm" */
export function parsePhysicalDimensions(raw: string): {
  physicalHeightMm: number
  physicalWidthMm: number
  physicalThicknessMm: number
} | null {
  const normalized = raw.toLowerCase().trim()
  const isCm = normalized.includes('cm')
  const isInches = normalized.includes('inch') || normalized.includes('"')

  const numbers = normalized.match(/[\d.]+/g)?.map(Number).filter((n) => !Number.isNaN(n))
  if (!numbers || numbers.length < 2) return null

  const toMm = isCm ? cmToMm : isInches ? inchesToMm : inchesToMm
  const [a, b, c] = numbers

  if (numbers.length >= 3) {
    return {
      physicalHeightMm: toMm(a),
      physicalWidthMm: toMm(b),
      physicalThicknessMm: toMm(c),
    }
  }

  return {
    physicalHeightMm: toMm(a),
    physicalWidthMm: toMm(b),
    physicalThicknessMm: 20,
  }
}

function detailsToMatch(
  details: OpenLibraryDetails,
  confidence: number,
  source: OpenLibraryMatch['source'],
): OpenLibraryMatch | null {
  let physicalHeightMm: number | undefined
  let physicalWidthMm: number | undefined
  let physicalThicknessMm: number | undefined

  if (details.physical_dimensions) {
    const parsed = parsePhysicalDimensions(details.physical_dimensions)
    if (parsed) {
      physicalHeightMm = parsed.physicalHeightMm
      physicalWidthMm = parsed.physicalWidthMm
      physicalThicknessMm = parsed.physicalThicknessMm
    }
  }

  const isbn = details.isbn_13?.[0] ?? details.isbn_10?.[0]
  const coverUrl =
    details.cover?.large ?? details.cover?.medium ?? details.cover?.small

  if (!physicalHeightMm && !details.number_of_pages && !isbn) {
    return null
  }

  return {
    isbn,
    pageCount: details.number_of_pages,
    printType: details.physical_format,
    physicalHeightMm,
    physicalWidthMm,
    physicalThicknessMm,
    coverUrl,
    confidence,
    source,
  }
}

async function fetchDetailsByIsbn(isbn: string): Promise<OpenLibraryDetails | null> {
  const clean = isbn.replace(/-/g, '')
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(clean)}&format=json&jscmd=details`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const entry = data[`ISBN:${clean}`]
  return entry?.details ?? null
}

async function fetchEditionByOlid(olid: string): Promise<OpenLibraryDetails | null> {
  const key = olid.startsWith('/books/') ? olid : `/books/${olid}`
  const url = `https://openlibrary.org${key}.json`
  const res = await fetch(url)
  if (!res.ok) return null
  const edition = await res.json()
  const isbn = edition.isbn_13?.[0] ?? edition.isbn_10?.[0]
  if (isbn) {
    const fromIsbn = await fetchDetailsByIsbn(isbn)
    if (fromIsbn) return fromIsbn
  }
  return {
    number_of_pages: edition.number_of_pages,
    physical_format: edition.physical_format,
    physical_dimensions: edition.physical_dimensions,
    isbn_13: edition.isbn_13,
    isbn_10: edition.isbn_10,
    title: edition.title,
  }
}

async function resolveDocDetails(doc: OpenLibrarySearchDoc): Promise<OpenLibraryDetails | null> {
  const docIsbn = doc.isbn?.find((i) => i.length === 13) ?? doc.isbn?.[0]
  if (docIsbn) {
    const details = await fetchDetailsByIsbn(docIsbn)
    if (details) return details
  }
  if (doc.cover_edition_key) {
    return fetchEditionByOlid(doc.cover_edition_key)
  }
  return null
}

async function searchDocs(query: string, limit = 5): Promise<OpenLibrarySearchDoc[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return (data.docs as OpenLibrarySearchDoc[]) ?? []
}

async function bestMatchFromDocs(
  docs: OpenLibrarySearchDoc[],
  title: string,
  author: string,
  source: OpenLibraryMatch['source'],
  englishTitle?: string,
  pageCount?: number,
  minScore = 0.55,
): Promise<OpenLibraryMatch | null> {
  let best: OpenLibraryMatch | null = null
  let bestScore = 0
  const authorHint = source === 'open-library-author'

  for (const doc of docs) {
    const titleSim = titleMatchScore(doc.title ?? '', title, englishTitle)
    const authorSim = Math.max(
      similarity(author, doc.author_name?.[0] ?? ''),
      similarity(primaryAuthor(author), doc.author_name?.[0] ?? ''),
    )
    if (authorSim < 0.5) continue

    let score: number
    if (authorHint && pageCount && doc.number_of_pages_median) {
      const pcs = pageCountSimilarity(pageCount, doc.number_of_pages_median)
      score = authorSim * 0.25 + titleSim * 0.25 + pcs * 0.5
    } else {
      score = titleSim * 0.55 + authorSim * 0.35
      if (pageCount && doc.number_of_pages_median) {
        score += pageCountSimilarity(pageCount, doc.number_of_pages_median) * 0.1
      }
    }

    if (score < minScore) continue

    const details = await resolveDocDetails(doc)
    if (!details) continue

    let finalScore = score
    if (details.physical_dimensions) finalScore += 0.1

    const match = detailsToMatch(details, finalScore, source)
    if (match && finalScore > bestScore) {
      bestScore = finalScore
      best = match
    }
  }

  return best
}

export async function lookupByIsbn(isbn: string): Promise<OpenLibraryMatch | null> {
  const details = await fetchDetailsByIsbn(isbn)
  if (!details) return null
  return detailsToMatch(details, 1, 'open-library-isbn')
}

export async function lookupByTitleAuthor(
  title: string,
  author: string,
  source: OpenLibraryMatch['source'] = 'open-library-title',
  englishTitle?: string,
  pageCount?: number,
): Promise<OpenLibraryMatch | null> {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(primaryAuthor(author))}&limit=5`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  return bestMatchFromDocs(
    (data.docs as OpenLibrarySearchDoc[]) ?? [],
    title,
    author,
    source,
    englishTitle ?? (source.includes('-en') ? title : undefined),
    pageCount,
  )
}

export async function lookupByAuthorWithTitleHints(
  originalTitle: string,
  author: string,
  englishTitle: string,
  pageCount?: number,
): Promise<OpenLibraryMatch | null> {
  const authorName = primaryAuthor(author)
  const docs = await searchDocs(`author:"${authorName}"`, 25)
  return bestMatchFromDocs(
    docs,
    originalTitle,
    author,
    'open-library-author',
    englishTitle,
    pageCount,
    0.45,
  )
}

export async function lookupByEnglishTitle(
  originalTitle: string,
  englishTitle: string,
  author: string,
  pageCount?: number,
): Promise<OpenLibraryMatch | null> {
  const authorName = primaryAuthor(author)
  const byParams = await lookupByTitleAuthor(
    englishTitle,
    authorName,
    'open-library-title-en',
    englishTitle,
    pageCount,
  )
  if (byParams?.physicalHeightMm) return byParams

  const docs = await searchDocs(`${englishTitle} ${authorName}`, 8)
  const byQuery = await bestMatchFromDocs(
    docs,
    originalTitle,
    author,
    'open-library-title-en',
    englishTitle,
    pageCount,
  )
  return byQuery ?? byParams
}

export function getOpenLibraryCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn.replace(/-/g, '')}-L.jpg`
}
