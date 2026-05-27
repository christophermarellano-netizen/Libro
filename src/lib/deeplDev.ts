export interface TranslationResult {
  text: string
  detectedSourceLang?: string
}

function deeplBasePath(apiKey: string): string {
  return apiKey.trim().endsWith(':fx') ? '/api/deepl-free' : '/api/deepl-pro'
}

export async function translateText(
  text: string,
  apiKey: string,
  sourceLang = 'ES',
  targetLang = 'EN',
): Promise<TranslationResult> {
  const base = deeplBasePath(apiKey)
  const url = `${base}/v2/translate`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
    })
  } catch {
    throw new Error(
      'Network error reaching DeepL. Make sure the dev server is running (npm run dev).',
    )
  }

  if (!res.ok) {
    const err = await res.text()
    if (res.status === 403) {
      throw new Error('DeepL rejected the request. Check your API key in Settings.')
    }
    throw new Error(`DeepL error (${res.status}): ${err}`)
  }

  const data = await res.json()
  const translation = data.translations?.[0]
  return {
    text: translation?.text ?? '',
    detectedSourceLang: translation?.detected_source_language,
  }
}
