import { useCallback, useState } from 'react'
import { translateText } from '../lib/deepl'
import { db } from '../db'

export function useTranslate() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const translate = useCallback(async (text: string) => {
    setLoading(true)
    setError(null)
    try {
      const settings = await db.settings.get(1)
      const apiKey = settings?.deeplApiKey
      if (!apiKey) {
        throw new Error('Add your DeepL API key in Settings')
      }
      const result = await translateText(text, apiKey)
      return result.text
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Translation failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const saveVocab = useCallback(
    async (bookId: number, word: string, translation: string, context?: string) => {
      await db.vocab.add({
        bookId,
        word,
        translation,
        context,
        addedAt: Date.now(),
      })
      const { scheduleVocabSync } = await import('../lib/sync')
      scheduleVocabSync()
    },
    [],
  )

  return { translate, saveVocab, loading, error }
}
