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
  if (relative.startsWith('/')) return relative.slice(1)
  const baseParts = base.split('/')
  baseParts.pop()
  const parts = relative.split('/')
  for (const part of parts) {
    if (part === '..') baseParts.pop()
    else if (part !== '.' && part !== '') baseParts.push(part)
  }
  return baseParts.join('/')
}

async function extractCover(
  zip: JSZip,
  opfDoc: Document,
  opfPath: string,
): Promise<{ blob?: Blob; width?: number; height?: number }> {
  const manifest = opfDoc.querySelector('manifest')
  if (!manifest) return {}

  let coverHref: string | undefined

  manifest.querySelectorAll('item').forEach((item) => {
    const props = item.getAttribute('properties') || ''
    const id = item.getAttribute('id') || ''
    if (props.includes('cover-image') || id === 'cover-image') {
      coverHref = item.getAttribute('href') || undefined
    }
  })

  if (!coverHref) {
    const coverMeta = opfDoc.querySelector('meta[name="cover"]')
    const coverId = coverMeta?.getAttribute('content')
    if (coverId) {
      manifest.querySelectorAll('item').forEach((item) => {
        if (item.getAttribute('id') === coverId) {
          coverHref = item.getAttribute('href') || undefined
        }
      })
    }
  }

  if (!coverHref) return {}

  const coverPath = resolvePath(opfPath, coverHref)
  const file = zip.file(coverPath)
  if (!file) return {}

  const blob = await file.async('blob')
  const dims = await getImageDimensions(blob)
  return { blob, ...dims }
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
