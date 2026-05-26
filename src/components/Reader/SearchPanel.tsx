import { useEffect, useState } from 'react'
import type { ReaderTheme, SearchHit } from '../../types'

interface SearchPanelProps {
  open: boolean
  theme: ReaderTheme
  onClose: () => void
  onSearch: (query: string) => Promise<SearchHit[]>
  onSelect: (cfi: string) => void
}

export function SearchPanel({ open, theme, onClose, onSearch, onSelect }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  const runSearch = async (value: string) => {
    setQuery(value)
    if (value.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      setResults(await onSearch(value))
    } finally {
      setSearching(false)
    }
  }

  if (!open) return null

  return (
    <div className="absolute inset-0 z-[60] flex flex-col" data-reader-theme={theme}>
      <header className="reader-panel shrink-0 border-b px-3 pb-2 pt-[max(8px,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <div className="reader-search-field flex min-w-0 flex-1 items-center rounded-[10px] px-3 py-2">
            <input
              type="search"
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="Search"
              autoFocus
              className="w-full bg-transparent text-[17px] outline-none placeholder:opacity-60"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="reader-chrome-link shrink-0 px-2 py-2 text-[17px]"
          >
            Cancel
          </button>
        </div>
      </header>

      <div className="reader-panel min-h-0 flex-1 overflow-y-auto">
        {searching && (
          <p className="reader-chrome-subtitle px-4 py-6 text-[15px]">Searching…</p>
        )}

        {!searching && query.length >= 2 && results.length === 0 && (
          <p className="reader-chrome-subtitle px-4 py-6 text-[15px]">No Results</p>
        )}

        {!searching && query.length < 2 && (
          <p className="reader-chrome-subtitle px-4 py-6 text-[15px]">
            Enter at least 2 characters to search this book.
          </p>
        )}

        <ul className="list-none p-0">
          {results.map((hit) => (
            <li key={hit.cfi}>
              <button
                type="button"
                onClick={() => {
                  onSelect(hit.cfi)
                  onClose()
                }}
                className="reader-list-row w-full px-4 py-3 text-left"
              >
                <p
                  className="line-clamp-4 text-[15px] leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: highlightQuery(hit.excerpt, query),
                  }}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function highlightQuery(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text)
  const escaped = escapeHtml(text)
  const pattern = new RegExp(`(${escapeRegex(query.trim())})`, 'gi')
  return escaped.replace(
    pattern,
    '<mark class="rounded-sm bg-[var(--reader-tint)]/25 px-0.5 text-inherit">$1</mark>',
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
