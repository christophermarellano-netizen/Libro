import { useEffect, useRef } from 'react'
import type { Book } from '../../types'

interface BookContextMenuProps {
  book: Book
  x: number
  y: number
  onRemove: () => void
  onClose: () => void
}

export function BookContextMenu({ book, x, y, onRemove, onClose }: BookContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const rect = menu.getBoundingClientRect()
    const padding = 12
    let left = x
    let top = y

    if (left + rect.width > window.innerWidth - padding) {
      left = window.innerWidth - rect.width - padding
    }
    if (top + rect.height > window.innerHeight - padding) {
      top = window.innerHeight - rect.height - padding
    }

    left = Math.max(padding, left)
    top = Math.max(padding, top)

    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
  }, [x, y])

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-[70] cursor-default border-0 bg-black/10 p-0"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Actions for ${book.title}`}
        className="fixed z-[71] min-w-[200px] overflow-hidden rounded-xl border border-libro-border bg-libro-surface py-1 shadow-xl"
        style={{ left: x, top: y }}
      >
        <div className="border-b border-libro-border px-4 py-2.5">
          <p className="truncate text-sm font-semibold text-libro-text">{book.title}</p>
          <p className="truncate text-xs text-libro-muted">{book.author}</p>
        </div>
        <button
          type="button"
          role="menuitem"
          className="flex w-full px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
          onClick={onRemove}
        >
          Remove from library
        </button>
      </div>
    </>
  )
}
