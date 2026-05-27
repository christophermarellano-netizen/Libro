import { useEffect, useState } from 'react'
import { getSyncState, subscribeSyncState, syncOnLogin, type SyncState } from '../lib/sync'

export function useSync() {
  const [state, setState] = useState<SyncState>(getSyncState)

  useEffect(() => subscribeSyncState(setState), [])

  return {
    ...state,
    syncNow: syncOnLogin,
  }
}
