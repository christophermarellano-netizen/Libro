import type { Book } from '../../types'
import { libraryDisplayScale } from '../../lib/bookDimensions'
import { BookCard } from './BookCard'

interface CoverGridProps {
  books: Book[]
  onOpen: (book: Book) => void
  onDelete: (book: Book) => void
}

export function CoverGrid({ books, onOpen, onDelete }: CoverGridProps) {
  const scale = libraryDisplayScale(books)

  if (books.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-libro-muted">
        <p className="text-lg">Your library is empty</p>
        <p className="text-sm">Import a Spanish EPUB to get started</p>
      </div>
    )
  }

  return (
    <div className="grid auto-rows-[1fr] grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-10 p-10">
      {books.map((book) => (
        <div key={book.id} className="flex items-end justify-center">
          <BookCard
            book={book}
            scale={scale}
            onClick={() => onOpen(book)}
            onContextMenu={(e) => {
              e.preventDefault()
              if (confirm(`Delete "${book.title}"?`)) onDelete(book)
            }}
          />
        </div>
      ))}
    </div>
  )
}
