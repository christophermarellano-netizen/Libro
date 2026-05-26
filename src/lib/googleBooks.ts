import type { GoogleBooksVolume } from '../types'
import {
  pageCountSimilarity,
  primaryAuthor,
  similarity,
  titleMatchScore,
} from './textMatch'

export interface GoogleBooksMatch {
  isbn?: string
  pageCount?: number
  printType?: string
  physicalHeightMm?: number
  physicalWidthMm?: number
  physicalThicknessMm?: number
  coverUrl?: string
  confidence: number
}

function cmToMm(cm: string | undefined): number | undefined {
  if (!cm) return undefined
  const val = parseFloat(cm)
  return Number.isNaN(val) ? undefined : val * 10
}

function extractIsbn(volume: GoogleBooksVolume): string | undefined {
  const ids = volume.volumeInfo?.industryIdentifiers ?? []
  for (const id of ids) {
    if (id.type?.includes('ISBN') && id.identifier) {
      return id.identifier.replace(/-/g, '')
    }
  }
  return undefined
}

function getCoverUrl(volume: GoogleBooksVolume): string | undefined {
  const links = volume.volumeInfo?.imageLinks
  if (!links) return undefined
  const url =
    links.extraLarge ||
    links.large ||
    links.medium ||
    links.small ||
    links.thumbnail ||
    links.smallThumbnail
  return url?.replace('http://', 'https://')
}

function volumeToMatch(volume: GoogleBooksVolume, confidence: number): GoogleBooksMatch {
  const dims = volume.volumeInfo?.dimensions
  return {
    isbn: extractIsbn(volume),
    pageCount: volume.volumeInfo?.pageCount,
    printType: volume.volumeInfo?.printType,
    physicalHeightMm: cmToMm(dims?.height),
    physicalWidthMm: cmToMm(dims?.width),
    physicalThicknessMm: cmToMm(dims?.thickness),
    coverUrl: getCoverUrl(volume),
    confidence,
  }
}

async function fetchVolumes(query: string, maxResults = 5): Promise<GoogleBooksVolume[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return (data.items as GoogleBooksVolume[]) ?? []
}

function scoreVolume(
  item: GoogleBooksVolume,
  title: string,
  author: string,
  englishTitle?: string,
  pageCount?: number,
  authorHint = false,
): number {
  const vi = item.volumeInfo
  if (!vi) return 0

  const titleSim = titleMatchScore(vi.title ?? '', title, englishTitle)
  const authorSim = Math.max(
    similarity(author, vi.authors?.[0] ?? ''),
    similarity(primaryAuthor(author), vi.authors?.[0] ?? ''),
  )
  if (authorSim < 0.5) return 0

  if (authorHint && pageCount && vi.pageCount) {
    const pcs = pageCountSimilarity(pageCount, vi.pageCount)
    return authorSim * 0.25 + titleSim * 0.25 + pcs * 0.5 + (vi.dimensions?.height ? 0.05 : 0)
  }

  let score = titleSim * 0.55 + authorSim * 0.35
  if (pageCount && vi.pageCount) {
    score += pageCountSimilarity(pageCount, vi.pageCount) * 0.1
  }
  if (vi.language === 'en') score += 0.03
  if (vi.dimensions?.height) score += 0.05

  return score
}

async function bestMatchFromVolumes(
  items: GoogleBooksVolume[],
  title: string,
  author: string,
  englishTitle?: string,
  pageCount?: number,
  minScore = 0.55,
  authorHint = false,
): Promise<GoogleBooksMatch | null> {
  let best: GoogleBooksMatch | null = null
  let bestScore = 0

  for (const item of items) {
    const score = scoreVolume(item, title, author, englishTitle, pageCount, authorHint)
    if (score > bestScore && score >= minScore) {
      bestScore = score
      best = volumeToMatch(item, score)
    }
  }

  return best
}

export async function lookupByIsbn(isbn: string): Promise<GoogleBooksMatch | null> {
  const items = await fetchVolumes(`isbn:${isbn}`)
  if (items.length === 0) return null
  return volumeToMatch(items[0], 1)
}

export async function lookupByTitleAuthor(
  title: string,
  author: string,
  englishTitle?: string,
  pageCount?: number,
): Promise<GoogleBooksMatch | null> {
  const authorName = primaryAuthor(author)
  const query = `intitle:"${title}"+inauthor:"${authorName}"`
  const items = await fetchVolumes(query)
  return bestMatchFromVolumes(items, title, author, englishTitle, pageCount)
}

export async function lookupByEnglishTitle(
  originalTitle: string,
  englishTitle: string,
  author: string,
  pageCount?: number,
): Promise<GoogleBooksMatch | null> {
  const authorName = primaryAuthor(author)
  const byTitle = await lookupByTitleAuthor(englishTitle, authorName, englishTitle, pageCount)
  if (byTitle?.physicalHeightMm) return byTitle

  const items = await fetchVolumes(`${englishTitle} ${authorName}`, 8)
  return bestMatchFromVolumes(items, originalTitle, author, englishTitle, pageCount)
}

export async function lookupByAuthorWithTitleHints(
  originalTitle: string,
  author: string,
  englishTitle: string,
  pageCount?: number,
): Promise<GoogleBooksMatch | null> {
  const authorName = primaryAuthor(author)
  const items = await fetchVolumes(`inauthor:"${authorName}"`, 20)
  return bestMatchFromVolumes(items, originalTitle, author, englishTitle, pageCount, 0.45, true)
}

export async function fetchCoverBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    if (blob.size < 500) return null
    return blob
  } catch {
    return null
  }
}

export async function getImageSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}
