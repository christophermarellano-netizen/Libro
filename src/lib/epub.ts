import JSZip from 'jszip'
import type { EpubMetadata } from '../types'

function getTextContent(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? ''
}

function parseOpfMetadata(opfDoc: Document): Partial<EpubMetadata> {
  const metadata = opfDoc.querySelector('metadata')
  if (!metadata) return {}

  const title =
    getTextContent(metadata.querySelector('title')) ||
    getTextContent(metadata.querySelector('dc\\:title')) ||
    'Untitled'

  const creatorEl =
    metadata.querySelector('creator') ||
    metadata.querySelector('dc\\:creator')
  const author = getTextContent(creatorEl) || 'Unknown Author'

  let isbn: string | undefined
  const identifiers = metadata.querySelectorAll('identifier, dc\\:identifier')
  identifiers.forEach((idEl) => {
    const text = getTextContent(idEl)
    const scheme =
      idEl.getAttribute('opf:scheme') ||
      idEl.getAttribute('scheme') ||
      ''
    if (
      scheme.toLowerCase() === 'isbn' ||
      text.toLowerCase().startsWith('urn:isbn:') ||
      /^\d{10}$/.test(text.replace(/-/g, '')) ||
      /^\d{13}$/.test(text.replace(/-/g, ''))
    ) {
      isbn = text.replace(/^urn:isbn:/i, '').replace(/-/g, '')
    }
  })

  let pageCount: number | undefined
  const metaEls = metadata.querySelectorAll('meta')
  metaEls.forEach((meta) => {
    const name = meta.getAttribute('name') || meta.getAttribute('property') || ''
    if (name.includes('page-count') || name.includes('number-of-pages')) {
      const val = parseInt(meta.getAttribute('content') || '', 10)
      if (!Number.isNaN(val)) pageCount = val
    }
  })

  return { title, author, isbn, pageCount }
}

function resolvePath(base: string, relative: string): string {
  const decoded = decodeURIComponent(relative)
  if (decoded.startsWith('/')) return decoded.slice(1)
  const baseParts = base.split('/')
  baseParts.pop()
  const parts = decoded.split('/')
  for (const part of parts) {
    if (part === '..') baseParts.pop()
    else if (part !== '.' && part !== '') baseParts.push(part)
  }
  return baseParts.join('/')
}

function mimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg'
  }
}

function isImageMediaType(mediaType: string): boolean {
  return mediaType.startsWith('image/')
}

function isHtmlMediaType(mediaType: string): boolean {
  return mediaType.includes('html') || mediaType.includes('xml')
}

function findZipFile(zip: JSZip, path: string): JSZip.JSZipObject | null {
  const normalized = path.replace(/\\/g, '/').replace(/^\//, '')
  const direct = zip.file(normalized)
  if (direct) return direct

  const decoded = decodeURIComponent(normalized)
  const decodedFile = zip.file(decoded)
  if (decodedFile) return decodedFile

  const lower = decoded.toLowerCase()
  for (const name of Object.keys(zip.files)) {
    if (name.toLowerCase() === lower) return zip.file(name)
  }
  return null
}

async function blobFromZipFile(file: JSZip.JSZipObject, path: string): Promise<Blob> {
  const buffer = await file.async('arraybuffer')
  return new Blob([buffer], { type: mimeFromPath(path) })
}

function manifestItems(opfDoc: Document): Element[] {
  return [...opfDoc.querySelectorAll('manifest item, manifest > item')]
}

function itemById(manifest: Element[], id: string | null | undefined): Element | undefined {
  if (!id) return undefined
  return manifest.find((item) => item.getAttribute('id') === id)
}

function hrefFromItem(item: Element | undefined): string | undefined {
  return item?.getAttribute('href') ?? undefined
}

function mediaTypeFromItem(item: Element | undefined): string {
  return item?.getAttribute('media-type')?.toLowerCase() ?? ''
}

async function loadImageBlob(
  zip: JSZip,
  opfPath: string,
  href: string,
): Promise<{ blob?: Blob; width?: number; height?: number }> {
  const path = resolvePath(opfPath, href)
  const file = findZipFile(zip, path)
  if (!file) return {}

  const blob = await blobFromZipFile(file, path)
  const dims = await getImageDimensions(blob)
  if (!dims.width) return {}
  return { blob, ...dims }
}

async function loadImageFromHtml(
  zip: JSZip,
  opfPath: string,
  href: string,
): Promise<{ blob?: Blob; width?: number; height?: number }> {
  const htmlPath = resolvePath(opfPath, href)
  const file = findZipFile(zip, htmlPath)
  if (!file) return {}

  const html = await file.async('text')
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const img = doc.querySelector('img')
  const src = img?.getAttribute('src')
  if (!src) return {}

  return loadImageBlob(zip, htmlPath, src)
}

function discoverCoverHref(opfDoc: Document): { href?: string; item?: Element } {
  const manifest = manifestItems(opfDoc)

  for (const item of manifest) {
    const props = item.getAttribute('properties') ?? ''
    if (props.split(/\s+/).includes('cover-image')) {
      return { href: hrefFromItem(item), item }
    }
  }

  for (const item of manifest) {
    const id = item.getAttribute('id') ?? ''
    if (/^cover(-image)?$/i.test(id)) {
      return { href: hrefFromItem(item), item }
    }
  }

  const metadata = opfDoc.querySelector('metadata')
  if (metadata) {
    for (const meta of metadata.querySelectorAll('meta')) {
      const name = meta.getAttribute('name') ?? ''
      const property = meta.getAttribute('property') ?? ''
      const content = meta.getAttribute('content') ?? ''

      if (name === 'cover' && content) {
        const item = itemById(manifest, content)
        if (item) return { href: hrefFromItem(item), item }
      }

      if (property === 'cover-image' && content) {
        const item = itemById(manifest, content)
        if (item) return { href: hrefFromItem(item), item }
      }
    }
  }

  for (const item of manifest) {
    const id = item.getAttribute('id') ?? ''
    if (/cover/i.test(id)) {
      return { href: hrefFromItem(item), item }
    }
  }

  const spine = opfDoc.querySelector('spine')
  const firstId = spine?.querySelector('itemref')?.getAttribute('idref')
  const firstItem = itemById(manifest, firstId)
  if (firstItem) {
    const mediaType = mediaTypeFromItem(firstItem)
    if (isHtmlMediaType(mediaType) || /cover/i.test(firstId ?? '')) {
      return { href: hrefFromItem(firstItem), item: firstItem }
    }
  }

  for (const item of manifest) {
    const mediaType = mediaTypeFromItem(item)
    if (isImageMediaType(mediaType)) {
      const href = hrefFromItem(item)
      if (href && /cover/i.test(href)) {
        return { href, item }
      }
    }
  }

  return {}
}

async function extractCover(
  zip: JSZip,
  opfDoc: Document,
  opfPath: string,
): Promise<{ blob?: Blob; width?: number; height?: number }> {
  const { href, item } = discoverCoverHref(opfDoc)
  if (!href) return {}

  const mediaType = mediaTypeFromItem(item)
  if (isHtmlMediaType(mediaType)) {
    return loadImageFromHtml(zip, opfPath, href)
  }

  return loadImageBlob(zip, opfPath, href)
}

function getImageDimensions(blob: Blob): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve({})
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export async function isValidImageBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size === 0) return false
  const dims = await getImageDimensions(blob)
  return Boolean(dims.width && dims.height)
}

export async function parseEpub(file: File | Blob): Promise<EpubMetadata> {
  const zip = await JSZip.loadAsync(file)

  const containerXml = await zip.file('META-INF/container.xml')?.async('text')
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml')

  const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml')
  const rootfile = containerDoc.querySelector('rootfile')
  const opfPath = rootfile?.getAttribute('full-path')
  if (!opfPath) throw new Error('Invalid EPUB: missing OPF path')

  const opfContent = await zip.file(opfPath)?.async('text')
  if (!opfContent) throw new Error('Invalid EPUB: missing OPF file')

  const opfDoc = new DOMParser().parseFromString(opfContent, 'application/xml')
  const meta = parseOpfMetadata(opfDoc)
  const cover = await extractCover(zip, opfDoc, opfPath)

  return {
    title: meta.title ?? 'Untitled',
    author: meta.author ?? 'Unknown Author',
    isbn: meta.isbn,
    pageCount: meta.pageCount,
    coverBlob: cover.blob,
    coverWidth: cover.width,
    coverHeight: cover.height,
  }
}

export function createPlaceholderCover(title: string, color = '#e94560'): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 600
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 400, 600)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 28px Georgia, serif'
    ctx.textAlign = 'center'
    const words = title.split(' ')
    let line = ''
    let y = 280
    for (const word of words) {
      const test = line + word + ' '
      if (ctx.measureText(test).width > 340 && line) {
        ctx.fillText(line.trim(), 200, y)
        line = word + ' '
        y += 36
      } else {
        line = test
      }
    }
    if (line) ctx.fillText(line.trim(), 200, y)
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9)
  })
}

export function createSolidColorCover(color: string, width = 400, height = 600): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, width, height)
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92)
  })
}
