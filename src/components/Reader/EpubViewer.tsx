import { useEffect, useRef } from 'react'
import type { Rendition } from 'epubjs'

export interface ReaderTapEvent {
  word: string | null
  sentence: string
  x: number
  y: number
}

/** @deprecated Use ReaderTapEvent */
export type WordTapEvent = ReaderTapEvent & { word: string }

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
  on: (event: string, fn: () => void) => void
  off: (event: string, fn: () => void) => void
}

interface EpubViewerProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  ready: boolean
  translationEnabled: boolean
  onTap: (event: ReaderTapEvent) => void
  getRendition: () => Rendition | null
}

const TAP_MOVE_THRESHOLD_PX = 12
const TAP_MAX_DURATION_MS = 600

function extractWordFromRange(range: Range): string {
  let node = range.startContainer
  let offset = range.startOffset

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element
    const child = el.childNodes[offset] ?? el.childNodes[offset - 1]
    if (child?.nodeType === Node.TEXT_NODE) {
      node = child
      offset = 0
    } else {
      return ''
    }
  }

  if (node.nodeType !== Node.TEXT_NODE) return ''

  const text = node.textContent ?? ''
  let start = offset
  let end = offset

  while (start > 0 && /[\wáéíóúñüÁÉÍÓÚÑÜ'-]/.test(text[start - 1])) start--
  while (end < text.length && /[\wáéíóúñüÁÉÍÓÚÑÜ'-]/.test(text[end])) end++

  const word = text.slice(start, end).trim()
  if (word.length < 2) return ''
  if (offset < start || offset > end) return ''
  return word
}

function getWordAtPoint(doc: Document, x: number, y: number): string {
  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y)
    if (range) return extractWordFromRange(range)
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
      return extractWordFromRange(range)
    }
  }

  return ''
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

function toPageCoords(doc: Document, x: number, y: number) {
  const iframe = getIframe(doc)
  const iframeRect = iframe?.getBoundingClientRect()
  return {
    x: iframeRect ? iframeRect.left + x : x,
    y: iframeRect ? iframeRect.top + y : y,
  }
}

function isTapGesture(
  start: { x: number; y: number; t: number },
  endX: number,
  endY: number,
): boolean {
  if (Math.abs(endX - start.x) > TAP_MOVE_THRESHOLD_PX) return false
  if (Math.abs(endY - start.y) > TAP_MOVE_THRESHOLD_PX) return false
  if (Date.now() - start.t > TAP_MAX_DURATION_MS) return false
  return true
}

export function EpubViewer({
  containerRef,
  ready,
  translationEnabled,
  onTap,
  getRendition,
}: EpubViewerProps) {
  const onTapRef = useRef(onTap)
  const getRenditionRef = useRef(getRendition)
  const translationEnabledRef = useRef(translationEnabled)
  onTapRef.current = onTap
  getRenditionRef.current = getRendition
  translationEnabledRef.current = translationEnabled

  useEffect(() => {
    if (!ready) return
    const rendition = getRenditionRef.current() as EpubRendition | null
    if (!rendition) return

    const attachedDocs = new Set<Document>()
    const docCleanup = new Map<Document, () => void>()
    const touchStarts = new WeakMap<Document, { x: number; y: number; t: number }>()
    let suppressClickUntil = 0
    let lastTapAt = 0

    const emitTap = (doc: Document, x: number, y: number) => {
      const now = Date.now()
      if (now - lastTapAt < 280) return
      lastTapAt = now

      const word = translationEnabledRef.current ? getWordAtPoint(doc, x, y) : ''
      const page = toPageCoords(doc, x, y)

      onTapRef.current({
        word: word || null,
        sentence: word ? getSentence(doc, x, y) : '',
        x: page.x,
        y: page.y,
      })
    }

    const emitTapAtPagePoint = (x: number, y: number) => {
      const now = Date.now()
      if (now - lastTapAt < 280) return
      lastTapAt = now

      onTapRef.current({
        word: null,
        sentence: '',
        x,
        y,
      })
    }

    const attachDoc = (doc: Document) => {
      if (attachedDocs.has(doc)) return
      attachedDocs.add(doc)

      doc.body.style.cursor = 'default'
      doc.body.style.setProperty('-webkit-tap-highlight-color', 'transparent')
      doc.body.style.setProperty('touch-action', 'manipulation')

      const onTouchStart = (event: TouchEvent) => {
        const touch = event.touches[0]
        if (!touch) return
        touchStarts.set(doc, { x: touch.clientX, y: touch.clientY, t: Date.now() })
      }

      const onTouchEnd = (event: TouchEvent) => {
        const start = touchStarts.get(doc)
        touchStarts.delete(doc)
        const touch = event.changedTouches[0]
        if (!start || !touch) return
        if (!isTapGesture(start, touch.clientX, touch.clientY)) return

        event.preventDefault()
        suppressClickUntil = Date.now() + 450
        emitTap(doc, touch.clientX, touch.clientY)
      }

      const onClick = (event: MouseEvent) => {
        if (Date.now() < suppressClickUntil) return
        emitTap(doc, event.clientX, event.clientY)
      }

      doc.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
      doc.addEventListener('touchend', onTouchEnd, { capture: true, passive: false })
      doc.addEventListener('click', onClick, true)

      docCleanup.set(doc, () => {
        doc.removeEventListener('touchstart', onTouchStart, true)
        doc.removeEventListener('touchend', onTouchEnd, true)
        doc.removeEventListener('click', onClick, true)
      })
    }

    const syncContents = () => {
      try {
        rendition.getContents().forEach((contents) => {
          if (contents?.document) attachDoc(contents.document)
        })
      } catch {
        // getContents may fail before the first section renders
      }
    }

    const contentHook = (contents: EpubContents) => {
      if (contents?.document) attachDoc(contents.document)
    }

    const onRendered = () => syncContents()

    rendition.hooks.content.register(contentHook)
    rendition.on('rendered', onRendered)
    syncContents()

    const container = containerRef.current
    let containerTouchStart: { x: number; y: number; t: number } | null = null

    const onContainerTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      containerTouchStart = { x: touch.clientX, y: touch.clientY, t: Date.now() }
    }

    const onContainerTouchEnd = (event: TouchEvent) => {
      const start = containerTouchStart
      containerTouchStart = null
      const touch = event.changedTouches[0]
      if (!start || !touch) return
      if (!isTapGesture(start, touch.clientX, touch.clientY)) return

      const target = event.target as Node | null
      if (target instanceof HTMLIFrameElement && target.contentDocument) {
        const rect = target.getBoundingClientRect()
        emitTap(target.contentDocument, touch.clientX - rect.left, touch.clientY - rect.top)
        return
      }

      const iframe = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('iframe')
      if (iframe instanceof HTMLIFrameElement && iframe.contentDocument) {
        const rect = iframe.getBoundingClientRect()
        emitTap(iframe.contentDocument, touch.clientX - rect.left, touch.clientY - rect.top)
        return
      }

      emitTapAtPagePoint(touch.clientX, touch.clientY)
    }

    container?.addEventListener('touchstart', onContainerTouchStart, { passive: true })
    container?.addEventListener('touchend', onContainerTouchEnd, { passive: false })

    return () => {
      rendition.hooks.content.deregister(contentHook)
      rendition.off('rendered', onRendered)
      attachedDocs.forEach((doc) => {
        docCleanup.get(doc)?.()
      })
      attachedDocs.clear()
      docCleanup.clear()
      container?.removeEventListener('touchstart', onContainerTouchStart)
      container?.removeEventListener('touchend', onContainerTouchEnd)
    }
  }, [ready, containerRef])

  return (
    <div className="reader-scroll h-full w-full overflow-hidden touch-manipulation">
      <div ref={containerRef} className="h-full w-full overflow-hidden" />
    </div>
  )
}
