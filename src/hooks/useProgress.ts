import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export function useProgress(bookId: number | undefined) {
  return useLiveQuery(
    () => (bookId ? db.progress.get(bookId) : undefined),
    [bookId],
  )
}
