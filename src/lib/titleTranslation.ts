import { db } from '../db'
import { normalize } from './textMatch'
import { translateText } from './deepl'

async function translateWithMyMemory(title: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(title)}&langpair=es|en`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const translated = data.responseData?.translatedText?.trim()
    if (!translated || data.responseStatus !== 200) return null
    return translated
  } catch {
    return null
  }
}

async function translateWithDeepL(title: string, apiKey: string): Promise<string | null> {
  try {
    const base = apiKey.trim().endsWith(':fx') ? '/api/deepl-free' : '/api/deepl-pro'
    const res = await fetch(`${base}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [title],
        target_lang: 'EN',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.translations?.[0]?.text?.trim() ?? null
  } catch {
    return null
  }
}

/** Translate a book title to English for catalog lookup. Returns null if already English or translation fails. */
export async function translateTitleToEnglish(title: string): Promise<string | null> {
  const trimmed = title.trim()
  if (!trimmed) return null

  const settings = await db.settings.get(1)
  const deeplKey = settings?.deeplApiKey

  let translated: string | null = null
  if (deeplKey) {
    translated = await translateWithDeepL(trimmed, deeplKey)
  }
  if (!translated) {
    translated = await translateWithMyMemory(trimmed)
  }
  if (!translated) return null

  if (normalize(translated) === normalize(trimmed)) return null
  return translated
}

export { translateText }
