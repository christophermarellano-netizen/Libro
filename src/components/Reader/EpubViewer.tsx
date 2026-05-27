import { useEffect, useRef } from 'react'
import type { Rendition } from 'epubjs'

export interface WordTapEvent {
  word: string
  sentence: string
  x: number
  y: number
}

interface EpubContents {
  document: Document
}

type EpubRendition = Rendition & {
  hooks: {
    content: {
      register: (fn: (contents: EpubContents) => void) => void
      deregister: (fn: (contents: EpubContents) => void) => void
    }
  }
  getContents: () => EpubContents[]
}

interface EpubViewerProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  ready: boolean
  translationEnabled: boolean
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

function eventCoords(event: Event): { x: number; y: number } | null {
  if (event.type.startsWith('touch')) {
    const touch = (event as TouchEvent).changedTouches?.[0] ?? (event as TouchEvent).touches?.[0]
    if (touch) return { x: touch.clientX, y: touch.clientY }
  }

  const mouse = event as MouseEvent
  if (typeof mouse.clientX === 'number' && typeof mouse.clientY === 'number') {
    return { x: mouse.clientX, y: mouse.clientY }
  }

  return null
}

export function EpubViewer({
  containerRef,
  ready,
  translationEnabled,
  onWordTap,
  onBackgroundTap,
  getRendition,
}: EpubViewerProps) {
  const onWordTapRef = useRef(onWordTap)
  const onBackgroundTapRef = useRef(onBackgroundTap)
  const getRenditionRef = useRef(getRendition)
  const translationEnabledRef = useRef(translationEnabled)
  onWordTapRef.current = onWordTap
  onBackgroundTapRef.current = onBackgroundTap
  getRenditionRef.current = getRendition
  translationEnabledRef.current = translationEnabled

  useEffect(() => {
    if (!ready) return
    const rendition = getRenditionRef.current() as EpubRendition | null
    if (!rendition) return

    const attachedDocs = new Set<Document>()
    const docCleanup = new Map<Document, () => void>()
    let suppressClickUntil = 0

    const handlePointer = (doc: Document, event: Event) => {
      const coords = eventCoords(event)
      if (!coords) return

      const word = getWordAtPoint(doc, coords.x, coords.y)
      if (word.length < 2 || !translationEnabledRef.current) {
        onBackgroundTapRef.current?.()
        return
      }

      if (event.type === 'touchend') {
        suppressClickUntil = Date.now() + 400
      } else if (event.type === 'click' && Date.now() < suppressClickUntil) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const iframe = getIframe(doc)
      const iframeRect = iframe?.getBoundingClientRect()
      const pageX = iframeRect ? iframeRect.left + coords.x : coords.x
      const pageY = iframeRect ? iframeRect.top + coords.y : coords.y

      onWordTapRef.current({
        word,
        sentence: getSentence(doc, coords.x, coords.y),
        x: pageX,
        y: pageY,
      })
    }

    const attachDoc = (doc: Document) => {
      if (attachedDocs.has(doc)) return
      attachedDocs.add(doc)

      const onClick = (event: Event) => handlePointer(doc, event)
      const onTouchEnd = (event: Event) => handlePointer(doc, event)

      doc.addEventListener('click', onClick, true)
      doc.addEventListener('touchend', onTouchEnd, true)

      docCleanup.set(doc, () => {
        doc.removeEventListener('click', onClick, true)
        doc.removeEventListener('touchend', onTouchEnd, true)
      })
    }

    const contentHook = (contents: EpubContents) => {
      if (contents?.document) attachDoc(contents.document)
    }

    rendition.hooks.content.register(contentHook)

    try {
      rendition.getContents().forEach((contents) => {
        if (contents?.document) attachDoc(contents.document)
      })
    } catch {
      // getContents may fail before the first section renders
    }

    return () => {
      rendition.hooks.content.deregister(contentHook)
      attachedDocs.forEach((doc) => {
        docCleanup.get(doc)?.()
      })
      attachedDocs.clear()
      docCleanup.clear()
    }
  }, [ready])

  return (
    <div className="reader-scroll h-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full overflow-hidden" />
    </div>
  )
}
