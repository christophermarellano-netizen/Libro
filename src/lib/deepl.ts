import { translateText as translateViaDevProxy } from './deeplDev'

function deeplEdgeFunctionUrl(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) return null
  return `${supabaseUrl}/functions/v1/deepl-translate`
}

function isDevProxyAvailable(): boolean {
  return import.meta.env.DEV
}

export interface TranslationResult {
  text: string
  detectedSourceLang?: string
}

export async function translateText(
  text: string,
  apiKey: string,
  sourceLang = 'ES',
  targetLang = 'EN',
): Promise<TranslationResult> {
  const body = JSON.stringify({
    text: [text],
    source_lang: sourceLang,
    target_lang: targetLang,
  })

  if (isDevProxyAvailable()) {
    return translateViaDevProxy(text, apiKey, sourceLang, targetLang)
  }

  const edgeUrl = deeplEdgeFunctionUrl()
  if (!edgeUrl) {
    throw new Error(
      'Translation requires Supabase. Set VITE_SUPABASE_URL and deploy the deepl-translate Edge Function, or run locally with npm run dev.',
    )
  }

  const { supabase } = await import('./supabase/client')
  const session = supabase ? (await supabase.auth.getSession()).data.session : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-DeepL-Auth-Key': apiKey.trim(),
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  } else if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
    headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
  }

  let res: Response
  try {
    res = await fetch(edgeUrl, {
      method: 'POST',
      headers,
      body,
    })
  } catch {
    throw new Error('Network error reaching translation service.')
  }

  if (!res.ok) {
    const err = await res.text()
    if (res.status === 403) {
      throw new Error('DeepL rejected the request. Check your API key in Settings.')
    }
    throw new Error(`Translation error (${res.status}): ${err}`)
  }

  const data = await res.json()
  const translation = data.translations?.[0]
  return {
    text: translation?.text ?? '',
    detectedSourceLang: translation?.detected_source_language,
  }
}
