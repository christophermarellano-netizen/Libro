import { useEffect, useRef } from 'react'
import type { Rendition } from 'epubjs'

export interface WordTapEvent {
  word: string
  sentence: string
  x: number
  y: number
}

interface EpubViewerProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  ready: boolean
  onWordTap: (event: WordTapEvent) => void
  onBackgroundTap?: () => void
  getRendition: () => Rendition | null
}

function extractWordFromRange(range: Range): string {
  let node = range.startContainer
  let offset = range.startOffset

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element
    const child = el.childNodes[offset] ?? el.childNodes[offset - 1]
    if (child?.nodeType === Node.TEXT_NODE) {
      node = child
      offset = 0
    } else if (el.textContent) {
      return el.textContent.trim().split(/\s+/)[0] ?? ''
    }
  }

  if (node.nodeType !== Node.TEXT_NODE) return ''

  const text = node.textContent ?? ''
  let start = offset
  let end = offset

  while (start > 0 && /[\wáéíóúñüÁÉÍÓÚÑÜ'-]/.test(text[start - 1])) start--
  while (end < text.length && /[\wáéíóúñüÁÉÍÓÚÑÜ'-]/.test(text[end])) end++

  return text.slice(start, end).trim()
}

function getWordAtPoint(doc: Document, x: number, y: number): string {
  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y)
    if (range) {
      const word = extractWordFromRange(range)
      if (word.length >= 2) return word
    }
  }

  if ('caretPositionFromPoint' in doc) {
    const pos = (
      doc as Document & {
        caretPositionFromPoint(
          x: number,
          y: number,
        ): { offsetNode: Node; offset: number } | null
      }
    ).caretPositionFromPoint(x, y)
    if (pos) {
      const range = doc.createRange()
      range.setStart(pos.offsetNode, pos.offset)
      range.setEnd(pos.offsetNode, pos.offset)
      const word = extractWordFromRange(range)
      if (word.length >= 2) return word
    }
  }

  const el = doc.elementFromPoint(x, y)
  if (!el) return ''

  const text = el.textContent?.trim() ?? ''
  const words = text.match(/[\wáéíóúñüÁÉÍÓÚÑÜ'-]{2,}/g)
  return words?.[0] ?? ''
}

function getSentence(doc: Document, x: number, y: number): string {
  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y)
    if (range) {
      const node = range.startContainer
      return (node.textContent ?? '').slice(0, 300)
    }
  }
  const el = doc.elementFromPoint(x, y)
  return el?.textContent?.slice(0, 300) ?? ''
}

function getIframe(doc: Document): HTMLIFrameElement | null {
  return doc.defaultView?.frameElement as HTMLIFrameElement | null
}

export function EpubViewer({
  containerRef,
  ready,
  onWordTap,
  onBackgroundTap,
  getRendition,
}: EpubViewerProps) {
  const onWordTapRef = useRef(onWordTap)
  const onBackgroundTapRef = useRef(onBackgroundTap)
  onWordTapRef.current = onWordTap
  onBackgroundTapRef.current = onBackgroundTap

  useEffect(() => {
    if (!ready) return
    const rendition = getRendition()
    if (!rendition) return

    const attachedDocs = new WeakSet<Document>()
    const handlers = new Map<Document, (e: MouseEvent) => void>()

    const handleDocClick = (doc: Document) => {
      let handler = handlers.get(doc)
      if (!handler) {
        handler = (e: MouseEvent) => {
          const word = getWordAtPoint(doc, e.clientX, e.clientY)
          if (word.length < 2) {
            onBackgroundTapRef.current?.()
            return
          }

          e.preventDefault()
          e.stopPropagation()

          const iframe = getIframe(doc)
          const iframeRect = iframe?.getBoundingClientRect()
          const pageX = iframeRect ? iframeRect.left + e.clientX : e.clientX
          const pageY = iframeRect ? iframeRect.top + e.clientY : e.clientY

          onWordTapRef.current({
            word,
            sentence: getSentence(doc, e.clientX, e.clientY),
            x: pageX,
            y: pageY,
          })
        }
        handlers.set(doc, handler)
      }
      return handler
    }

    const attachToDoc = (doc: Document) => {
      if (attachedDocs.has(doc)) return
      attachedDocs.add(doc)
      doc.addEventListener('click', handleDocClick(doc), true)
    }

    const attachAll = () => {
      try {
        rendition.getContents().forEach((contents) => {
          if (contents?.document) attachToDoc(contents.document)
        })
      } catch {
        // getContents may fail before first render
      }
    }

    rendition.on('rendered', attachAll)
    attachAll()

    return () => {
      handlers.forEach((handler, doc) => {
        doc.removeEventListener('click', handler, true)
      })
    }
  }, [ready, getRendition])

  return (
    <div className="reader-scroll h-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full overflow-hidden" />
    </div>
  )
}
