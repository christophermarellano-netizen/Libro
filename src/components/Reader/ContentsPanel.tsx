import { useState } from 'react'
import type { Bookmark, ReaderTheme, TocEntry } from '../../types'

interface ContentsPanelProps {
  open: boolean
  theme: ReaderTheme
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
            className="reader-list-row w-full text-left text-[17px] leading-snug"
            style={{ paddingLeft: `${16 + depth * 14}px`, paddingRight: '16px' }}
          >
            {item.label}
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
  theme,
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
    <div className="absolute inset-0 z-[60] flex" data-reader-theme={theme}>
      <div className="reader-panel flex h-full w-full max-w-[320px] flex-col shadow-2xl sm:max-w-sm">
        <header className="shrink-0 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="reader-chrome-title text-[20px] font-bold tracking-[-0.02em]">
              {tab === 'contents' ? 'Contents' : 'Bookmarks'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="reader-chrome-link text-[17px] font-normal"
            >
              Done
            </button>
          </div>
          <div className="reader-segmented flex p-0.5">
            <button
              type="button"
              onClick={() => setTab('contents')}
              className={`flex-1 rounded-[7px] py-1.5 text-[13px] font-medium ${
                tab === 'contents' ? 'reader-segmented-active shadow-sm' : 'reader-chrome-subtitle'
              }`}
            >
              Contents
            </button>
            <button
              type="button"
              onClick={() => setTab('bookmarks')}
              className={`flex-1 rounded-[7px] py-1.5 text-[13px] font-medium ${
                tab === 'bookmarks' ? 'reader-segmented-active shadow-sm' : 'reader-chrome-subtitle'
              }`}
            >
              Bookmarks
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'contents' ? (
            items.length === 0 ? (
              <p className="reader-chrome-subtitle px-4 py-6 text-[15px]">No table of contents found.</p>
            ) : (
              <TocList items={items} depth={0} onSelect={onSelectHref} />
            )
          ) : bookmarks.length === 0 ? (
            <p className="reader-chrome-subtitle px-4 py-6 text-[15px]">
              Bookmarks you add while reading will appear here.
            </p>
          ) : (
            <ul className="list-none p-0">
              {[...bookmarks].reverse().map((bookmark) => (
                <li key={bookmark.id} className="reader-list-row flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelectCfi(bookmark.cfi)}
                    className="min-w-0 flex-1 px-4 py-3 text-left"
                  >
                    <p className="reader-chrome-title truncate text-[17px] leading-snug">{bookmark.label}</p>
                    <p className="reader-chrome-subtitle text-[13px]">
                      {Math.round(bookmark.percentage)}%
                    </p>
                  </button>
                  {bookmark.id !== undefined && (
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(bookmark.id!)}
                      className="reader-chrome-subtitle shrink-0 px-4 py-3 text-[17px] hover:text-red-500"
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
      <button
        type="button"
        className="hidden flex-1 bg-black/20 sm:block"
        aria-label="Close menu"
        onClick={onClose}
      />
    </div>
  )
}
