import { ensureSettings, updateSettings } from '../../db'
import { requireSupabase } from '../supabase/client'
import { cloudRowToSettings, settingsToCloudRow, type CloudSettings } from './types'

export async function pushSettings(userId: string): Promise<void> {
  const settings = await ensureSettings()
  const client = requireSupabase()
  const row = settingsToCloudRow(settings, userId)
  const { error } = await client.from('user_settings').upsert(row)
  if (error) throw error
}

export async function pullSettings(userId: string): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return

  const cloud = data as CloudSettings
  const local = await ensureSettings()
  const localUpdated = local.syncUpdatedAt ?? 0

  if (cloud.updated_at > localUpdated) {
    await updateSettings(cloudRowToSettings(cloud))
  } else if (localUpdated > cloud.updated_at) {
    await pushSettings(userId)
  }
}
