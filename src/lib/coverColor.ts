function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  )
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function muteColor(r: number, g: number, b: number): [number, number, number] {
  const avg = (r + g + b) / 3
  const factor = 0.75
  return [
    Math.round(r * factor + avg * (1 - factor)),
    Math.round(g * factor + avg * (1 - factor)),
    Math.round(b * factor + avg * (1 - factor)),
  ]
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function contrastTextColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return luminance(r, g, b) > 0.4 ? '#1a1a1a' : '#f5f5f5'
}

function extractDominantColor(img: HTMLImageElement): [number, number, number] {
  const canvas = document.createElement('canvas')
  const size = 50
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, size, size)
  const data = ctx.getImageData(0, 0, size, size).data

  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>()

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 128) continue
    const key = `${Math.round(r / 32)},${Math.round(g / 32)},${Math.round(b / 32)}`
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 }
    bucket.r += r
    bucket.g += g
    bucket.b += b
    bucket.count++
    buckets.set(key, bucket)
  }

  let best = { r: 74, g: 74, b: 106, count: 0 }
  buckets.forEach((bucket) => {
    if (bucket.count > best.count) best = bucket
  })

  return [
    Math.round(best.r / best.count),
    Math.round(best.g / best.count),
    Math.round(best.b / best.count),
  ]
}

export async function extractSpineColors(
  coverBlob: Blob,
): Promise<{ spineColorHex: string; spineTextColorHex: string }> {
  const url = URL.createObjectURL(coverBlob)

  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = url
    })

    const dominant = extractDominantColor(img)
    const [mr, mg, mb] = muteColor(dominant[0], dominant[1], dominant[2])
    const spineColorHex = rgbToHex(mr, mg, mb)
    const spineTextColorHex = contrastTextColor(spineColorHex)

    return { spineColorHex, spineTextColorHex }
  } catch {
    return { spineColorHex: '#4a4a6a', spineTextColorHex: '#f5f5f5' }
  } finally {
    URL.revokeObjectURL(url)
  }
}
