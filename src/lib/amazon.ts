import { db } from '../db'

export interface AmazonCredentials {
  accessKey: string
  secretKey: string
  partnerTag: string
  marketplace: string
}

export interface AmazonMatch {
  isbn?: string
  pageCount?: number
  printType?: string
  physicalHeightMm?: number
  physicalWidthMm?: number
  physicalThicknessMm?: number
  coverUrl?: string
  confidence: number
}

interface AmazonDimension {
  DisplayValue?: number
  Unit?: string
}

function unitToMm(value: number, unit?: string): number {
  const u = (unit ?? 'inches').toLowerCase()
  if (u.includes('cm') || u === 'centimeters') return Math.round(value * 10)
  if (u.includes('mm') || u === 'millimeters') return Math.round(value)
  return Math.round(value * 25.4)
}

function parseAmazonDimensions(dims: {
  Height?: AmazonDimension
  Width?: AmazonDimension
  Length?: AmazonDimension
}): { physicalHeightMm?: number; physicalWidthMm?: number; physicalThicknessMm?: number } {
  const height = dims.Height?.DisplayValue
  const width = dims.Width?.DisplayValue
  const length = dims.Length?.DisplayValue

  return {
    physicalHeightMm: height !== undefined ? unitToMm(height, dims.Height?.Unit) : undefined,
    physicalWidthMm: width !== undefined ? unitToMm(width, dims.Width?.Unit) : undefined,
    physicalThicknessMm: length !== undefined ? unitToMm(length, dims.Length?.Unit) : undefined,
  }
}

async function getCredentials(): Promise<AmazonCredentials | null> {
  const settings = await db.settings.get(1)
  if (
    !settings?.amazonAccessKey ||
    !settings?.amazonSecretKey ||
    !settings?.amazonPartnerTag
  ) {
    return null
  }
  return {
    accessKey: settings.amazonAccessKey,
    secretKey: settings.amazonSecretKey,
    partnerTag: settings.amazonPartnerTag,
    marketplace: settings.amazonMarketplace ?? 'www.amazon.es',
  }
}

async function searchAmazon(
  keywords: string,
  credentials: AmazonCredentials,
): Promise<AmazonMatch | null> {
  const res = await fetch('/api/amazon/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, credentials }),
  })

  if (!res.ok) return null
  const data = await res.json()
  const item = data.item
  if (!item) return null

  const productInfo = item.ItemInfo?.ProductInfo
  const dims = parseAmazonDimensions(productInfo?.ItemDimensions ?? {})
  const hasDims = dims.physicalHeightMm && dims.physicalWidthMm

  if (!hasDims) return null

  return {
    isbn: item.ISBN,
    pageCount: item.ItemInfo?.ContentInfo?.PagesCount?.DisplayValue,
    printType: productInfo?.ProductInfo?.ProductType?.DisplayValue,
    ...dims,
    coverUrl: item.Images?.Primary?.Large?.URL ?? item.Images?.Primary?.Medium?.URL,
    confidence: data.confidence ?? 0.8,
  }
}

export async function lookupByIsbn(isbn: string): Promise<AmazonMatch | null> {
  const credentials = await getCredentials()
  if (!credentials) return null
  return searchAmazon(isbn.replace(/-/g, ''), credentials)
}

export async function lookupByTitleAuthor(
  title: string,
  author: string,
): Promise<AmazonMatch | null> {
  const credentials = await getCredentials()
  if (!credentials) return null
  return searchAmazon(`${title} ${author}`, credentials)
}
