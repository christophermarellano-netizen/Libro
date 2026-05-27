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
  on?: (event: string, handler: (event: Event) => void) => void
  off?: (event: string, handler: (event: Event) => void) => void
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

const TAP_MOVE_THRESHOLD_PX = 14
const TAP_MAX_DURATION_MS = 700

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

function viewportToDocCoords(
  doc: Document,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const iframe = getIframe(doc)
  if (!iframe) return { x: clientX, y: clientY }
  const rect = iframe.getBoundingClientRect()
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function coordsFromEvent(doc: Document, event: Event): { x: number; y: number } | null {
  if (event.type.startsWith('touch')) {
    const touch =
      (event as TouchEvent).changedTouches?.[0] ?? (event as TouchEvent).touches?.[0]
    if (!touch) return null
    return viewportToDocCoords(doc, touch.clientX, touch.clientY)
  }

  const mouse = event as MouseEvent
  if (typeof mouse.clientX === 'number' && typeof mouse.clientY === 'number') {
    return viewportToDocCoords(doc, mouse.clientX, mouse.clientY)
  }

  return null
}

function findReaderIframe(
  root: HTMLElement,
  clientX: number,
  clientY: number,
): HTMLIFrameElement | null {
  const hit = document.elementFromPoint(clientX, clientY)
  const fromHit = hit?.closest('iframe')
  if (fromHit instanceof HTMLIFrameElement && root.contains(fromHit)) return fromHit

  for (const iframe of root.querySelectorAll('iframe')) {
    const rect = iframe.getBoundingClientRect()
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return iframe
    }
  }

  return null
}

export function EpubViewer({
  containerRef,
  ready,
  translationEnabled,
  onTap,
  getRendition,
}: EpubViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
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
    const contentHandlers = new Map<EpubContents, Map<string, (event: Event) => void>>()
    const touchStarts = new WeakMap<Document, { x: number; y: number; t: number }>()
    let lastTapAt = 0

    const emitTap = (doc: Document, x: number, y: number) => {
      const now = Date.now()
      if (now - lastTapAt < 220) return
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
      if (now - lastTapAt < 220) return
      lastTapAt = now

      onTapRef.current({
        word: null,
        sentence: '',
        x,
        y,
      })
    }

    const handleDocPointerEnd = (doc: Document, event: Event) => {
      const coords = coordsFromEvent(doc, event)
      if (!coords) return

      if (event.type.startsWith('touch')) {
        const start = touchStarts.get(doc)
        touchStarts.delete(doc)
        const touch = (event as TouchEvent).changedTouches?.[0]
        if (!start || !touch) return
        if (!isTapGesture(start, touch.clientX, touch.clientY)) return
      }

      emitTap(doc, coords.x, coords.y)
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

      const onTouchEnd = (event: Event) => handleDocPointerEnd(doc, event)
      const onClick = (event: Event) => handleDocPointerEnd(doc, event)

      doc.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
      doc.addEventListener('touchend', onTouchEnd, { capture: true, passive: true })
      doc.addEventListener('click', onClick, { capture: true, passive: true })

      docCleanup.set(doc, () => {
        doc.removeEventListener('touchstart', onTouchStart, true)
        doc.removeEventListener('touchend', onTouchEnd, true)
        doc.removeEventListener('click', onClick, true)
      })
    }

    const bindContents = (contents: EpubContents) => {
      if (contents?.document) attachDoc(contents.document)
      if (!contents.on || !contents.off) return

      const handlers = new Map<string, (event: Event) => void>()
      for (const eventName of ['touchend', 'click'] as const) {
        const handler = (event: Event) => {
          if (!contents.document) return
          handleDocPointerEnd(contents.document, event)
        }
        handlers.set(eventName, handler)
        contents.on(eventName, handler)
      }
      contentHandlers.set(contents, handlers)
    }

    const unbindContents = (contents: EpubContents) => {
      const handlers = contentHandlers.get(contents)
      if (handlers && contents.off) {
        handlers.forEach((handler, eventName) => contents.off!(eventName, handler))
      }
      contentHandlers.delete(contents)
    }

    const syncContents = () => {
      try {
        rendition.getContents().forEach((contents) => bindContents(contents))
      } catch {
        // getContents may fail before the first section renders
      }
    }

    const contentHook = (contents: EpubContents) => bindContents(contents)

    const onRendered = () => syncContents()

    rendition.hooks.content.register(contentHook)
    rendition.on('rendered', onRendered)
    syncContents()

    const container = containerRef.current
    const wrapper = wrapperRef.current
    let pointerStart: { x: number; y: number; t: number } | null = null

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pointerStart = { x: event.clientX, y: event.clientY, t: Date.now() }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const start = pointerStart
      pointerStart = null
      if (!start || !wrapper) return
      if (!isTapGesture(start, event.clientX, event.clientY)) return

      const target = event.target as Element | null
      if (target?.closest('[data-reader-chrome]')) return

      const root = container ?? wrapper
      const iframe = findReaderIframe(root, event.clientX, event.clientY)
      if (iframe?.contentDocument) {
        const rect = iframe.getBoundingClientRect()
        emitTap(iframe.contentDocument, event.clientX - rect.left, event.clientY - rect.top)
        return
      }

      if (target && root.contains(target)) {
        emitTapAtPagePoint(event.clientX, event.clientY)
      }
    }

    wrapper?.addEventListener('pointerdown', onPointerDown, { passive: true })
    wrapper?.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })

    const observer =
      container &&
      new MutationObserver(() => {
        container.querySelectorAll('iframe').forEach((iframe) => {
          if (iframe.contentDocument) attachDoc(iframe.contentDocument)
        })
      })
    if (observer && container) {
      observer.observe(container, { childList: true, subtree: true })
    }

    return () => {
      rendition.hooks.content.deregister(contentHook)
      rendition.off('rendered', onRendered)
      contentHandlers.forEach((_, contents) => unbindContents(contents))
      attachedDocs.forEach((doc) => {
        docCleanup.get(doc)?.()
      })
      attachedDocs.clear()
      docCleanup.clear()
      contentHandlers.clear()
      wrapper?.removeEventListener('pointerdown', onPointerDown)
      wrapper?.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointerup', onPointerUp)
      observer?.disconnect()
    }
  }, [ready, containerRef])

  return (
    <div
      ref={wrapperRef}
      className="reader-scroll h-full w-full overflow-hidden touch-manipulation"
    >
      <div ref={containerRef} className="h-full w-full overflow-hidden" />
    </div>
  )
}
