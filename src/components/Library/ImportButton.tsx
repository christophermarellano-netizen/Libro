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
        className="rounded-full bg-libro-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-80 disabled:opacity-50"
      >
        {importing ? 'Importing…' : '+ Import'}
      </button>
    </>
  )
}
