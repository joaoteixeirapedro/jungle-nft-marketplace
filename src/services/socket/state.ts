import { useSyncExternalStore } from 'react'
import type { ServerReadyPayload } from '@/types/diagnostics'

export interface RealtimeState {
  phase: 'connecting' | 'ready' | 'offline' | 'syncing' | 'error'
  ready?: ServerReadyPayload
  error?: string
  hasReconciled?: boolean
}
let state: RealtimeState = { phase: 'connecting' }
const listeners = new Set<() => void>()
let retry: (() => void) | undefined
export const realtimeState = () => state
export function publishRealtime(value: RealtimeState) { state = { ...value, hasReconciled: state.hasReconciled || value.phase === 'ready' }; listeners.forEach((notify) => notify()) }
export function registerRealtimeRetry(callback: () => void) { retry = callback; return () => { if (retry === callback) retry = undefined } }
export function retryRealtime() { retry?.() }
export function useRealtimeState() { return useSyncExternalStore((notify) => { listeners.add(notify); return () => { listeners.delete(notify) } }, realtimeState) }
