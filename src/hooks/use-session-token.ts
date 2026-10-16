import { useSyncExternalStore } from 'react'
import { getSessionToken, subscribeSession } from '@/lib/session'

export function useSessionToken() {
  return useSyncExternalStore(subscribeSession, getSessionToken, () => null)
}
