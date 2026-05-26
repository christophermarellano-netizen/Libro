import { useRef } from 'react'

interface ImportButtonProps {
  onImport: (files: FileList) => void
  importing?: boolean
}

export function ImportButton({ onImport, importing }: ImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub,application/epub+zip"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            onImport(e.target.files)
            e.target.value = ''
          }
        }}
      />
      <button
        type="button"
        disabled={importing}
        onClick={() => inputRef.current?.click()}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-libro-accent text-white transition hover:opacity-80 disabled:opacity-50"
        aria-label={importing ? 'Importing books' : 'Import books'}
        title={importing ? 'Importing...' : 'Import'}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </>
  )
}
