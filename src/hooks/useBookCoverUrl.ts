import { useEffect, useState } from 'react'

function normalizeCoverBlob(blob: Blob): Blob {
  if (blob.type && blob.type.startsWith('image/')) return blob
  return new Blob([blob], { type: 'image/jpeg' })
}

async function blobToDisplayUrl(blob: Blob): Promise<string> {
  const normalized = normalizeCoverBlob(blob)
  // iOS home-screen PWAs often fail to paint blob: URLs from IndexedDB in <img>.
  if (normalized.size <= 3_000_000) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(normalized)
    })
  }
  return URL.createObjectURL(normalized)
}

export function useBookCoverUrl(coverBlob: Blob | undefined, enabled = true) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [coverBlob?.size, coverBlob?.type])

  useEffect(() => {
    if (!enabled || failed || !coverBlob || coverBlob.size === 0) {
      setSrc(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    void blobToDisplayUrl(coverBlob).then((url) => {
      if (cancelled) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
        return
      }
      objectUrl = url.startsWith('blob:') ? url : null
      setSrc(url)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [coverBlob, coverBlob?.size, coverBlob?.type, enabled, failed])

  return { src, failed, setFailed }
}
