import { useState } from 'react'
import type { Bookmark, TocEntry } from '../../types'

interface ContentsPanelProps {
  open: boolean
  bookTitle?: string
  items: TocEntry[]
  bookmarks: Bookmark[]
  onClose: () => void
  onSelectHref: (href: string) => void
  onSelectCfi: (cfi: string) => void
  onRemoveBookmark: (id: number) => void
}

function TocList({
  items,
  depth,
  onSelect,
}: {
  items: TocEntry[]
  depth: number
  onSelect: (href: string) => void
}) {
  return (
    <ul className="list-none p-0">
      {items.map((item) => (
        <li key={item.id || item.href}>
          <button
            type="button"
            onClick={() => onSelect(item.href)}
            className={`flex w-full items-center border-b border-libro-border py-3.5 text-left transition hover:bg-black/[0.03] active:bg-black/[0.05] ${
              depth === 0 ? 'text-[15px] font-medium text-libro-text' : 'text-[14px] text-libro-text/90'
            }`}
            style={{ paddingLeft: `${16 + depth * 16}px`, paddingRight: '16px' }}
          >
            <span className="line-clamp-2 leading-snug">{item.label}</span>
          </button>
          {item.subitems && item.subitems.length > 0 && (
            <TocList items={item.subitems} depth={depth + 1} onSelect={onSelect} />
          )}
        </li>
      ))}
    </ul>
  )
}

export function ContentsPanel({
  open,
  bookTitle,
  items,
  bookmarks,
  onClose,
  onSelectHref,
  onSelectCfi,
  onRemoveBookmark,
}: ContentsPanelProps) {
  const [tab, setTab] = useState<'contents' | 'bookmarks'>('contents')

  if (!open) return null

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-libro-bg">
      <header className="relative shrink-0 border-b border-libro-border bg-libro-surface px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="relative mb-3 flex min-h-[36px] items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[15px] font-medium text-libro-muted transition hover:bg-black/5 hover:text-libro-text"
          >
            Done
          </button>
          <div className="max-w-[70%] text-center">
            <h2 className="truncate text-lg font-semibold text-libro-text">
              {tab === 'contents' ? 'Contents' : 'Bookmarks'}
            </h2>
            {bookTitle && (
              <p className="truncate text-xs text-libro-muted">{bookTitle}</p>
            )}
          </div>
        </div>

        <div className="flex rounded-lg bg-libro-bg p-1">
          <button
            type="button"
            onClick={() => setTab('contents')}
            className={`flex-1 rounded-md py-2 text-[13px] font-medium transition ${
              tab === 'contents'
                ? 'bg-libro-surface text-libro-text shadow-sm'
                : 'text-libro-muted hover:text-libro-text'
            }`}
          >
            Contents
          </button>
          <button
            type="button"
            onClick={() => setTab('bookmarks')}
            className={`flex-1 rounded-md py-2 text-[13px] font-medium transition ${
              tab === 'bookmarks'
                ? 'bg-libro-surface text-libro-text shadow-sm'
                : 'text-libro-muted hover:text-libro-text'
            }`}
          >
            Bookmarks
            {bookmarks.length > 0 && (
              <span className="ml-1 tabular-nums text-libro-muted">({bookmarks.length})</span>
            )}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'contents' ? (
          items.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-libro-muted">
              No table of contents found for this book.
            </p>
          ) : (
            <div className="bg-libro-surface">
              <TocList items={items} depth={0} onSelect={onSelectHref} />
            </div>
          )
        ) : bookmarks.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-libro-muted">
            Bookmarks you add while reading will appear here.
          </p>
        ) : (
          <ul className="list-none bg-libro-surface p-0">
            {[...bookmarks].reverse().map((bookmark) => (
              <li
                key={bookmark.id}
                className="flex items-stretch border-b border-libro-border last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => onSelectCfi(bookmark.cfi)}
                  className="min-w-0 flex-1 px-4 py-3.5 text-left transition hover:bg-black/[0.03] active:bg-black/[0.05]"
                >
                  <p className="truncate text-[15px] font-medium leading-snug text-libro-text">
                    {bookmark.label}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-libro-muted">
                    {Math.round(bookmark.percentage)}% through book
                  </p>
                </button>
                {bookmark.id !== undefined && (
                  <button
                    type="button"
                    onClick={() => onRemoveBookmark(bookmark.id!)}
                    className="shrink-0 px-4 text-lg text-libro-muted transition hover:text-red-600"
                    aria-label="Remove bookmark"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
