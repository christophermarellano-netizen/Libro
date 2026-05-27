import { useRef } from 'react'

interface ImportButtonProps {
  onImport: (files: FileList) => void
  importing?: boolean
  variant?: 'icon' | 'settings'
}

export function ImportButton({
  onImport,
  importing,
  variant = 'icon',
}: ImportButtonProps) {
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
      {variant === 'settings' ? (
        <button
          type="button"
          disabled={importing}
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg bg-libro-accent px-4 py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Choose EPUB file'}
        </button>
      ) : (
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
      )}
    </>
  )
}
