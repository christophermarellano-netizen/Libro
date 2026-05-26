export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\sáéíóúñü]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const wordsA = new Set(na.split(' '))
  const wordsB = new Set(nb.split(' '))
  let overlap = 0
  wordsA.forEach((w) => {
    if (wordsB.has(w)) overlap++
  })
  return overlap / Math.max(wordsA.size, wordsB.size)
}

/** First listed author, before "and"/"y"/commas. */
export function primaryAuthor(author: string): string {
  const trimmed = author.trim()
  const split = trimmed.split(/\s*,\s*|\s+(?:and|y)\s+/i)
  return split[0]?.trim() || trimmed
}

export function pageCountSimilarity(a?: number, b?: number): number {
  if (!a || !b) return 0
  const ratio = Math.min(a, b) / Math.max(a, b)
  if (ratio >= 0.92) return 1
  if (ratio >= 0.85) return 0.7
  if (ratio >= 0.75) return 0.4
  return 0
}

export function titleMatchScore(
  candidateTitle: string,
  originalTitle: string,
  englishTitle?: string,
): number {
  const scores = [similarity(originalTitle, candidateTitle)]
  if (englishTitle && normalize(englishTitle) !== normalize(originalTitle)) {
    scores.push(similarity(englishTitle, candidateTitle))
  }
  return Math.max(...scores)
}
