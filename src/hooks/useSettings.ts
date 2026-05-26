import { useLiveQuery } from 'dexie-react-hooks'
import { readSettings, updateSettings } from '../db'
import { DEFAULT_SETTINGS } from '../types'
import type { AppSettings } from '../types'

export function useSettings() {
  const settings = useLiveQuery(async () => {
    const existing = await readSettings()
    return existing ?? DEFAULT_SETTINGS
  }, [])

  const save = async (partial: Partial<AppSettings>) => {
    return updateSettings(partial)
  }

  return {
    settings: settings ?? null,
    save,
    loading: settings === undefined,
  }
}
