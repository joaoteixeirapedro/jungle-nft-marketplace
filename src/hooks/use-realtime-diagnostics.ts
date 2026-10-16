import { socket } from '@/services/socket/client'
import { retryRealtime, useRealtimeState } from '@/services/socket/state'

export function useRealtimeDiagnostics() {
  const state = useRealtimeState()
  return {
    status: state.phase === 'ready' || state.phase === 'syncing' ? 'connected' as const : state.phase === 'error' ? 'error' as const : 'disconnected' as const,
    ready: state.ready, error: state.error,
    connect: retryRealtime,
    disconnect: () => socket.disconnect(),
  }
}
