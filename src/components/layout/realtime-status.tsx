import { Button } from '@/components/ui/button'
import { retryRealtime, useRealtimeState } from '@/services/socket/state'
import { useAuth } from '@/features/auth/auth-context'

export function RealtimeStatus() {
  const state = useRealtimeState()
  const auth = useAuth()
  if (state.phase === 'ready' || state.phase === 'connecting') return null
  // Announce the initial reconciliation without inserting/removing a banner
  // above the whole page. Recovery and connection failures remain visible.
  if (state.phase === 'syncing' && !state.hasReconciled) return <p className="sr-only" role="status">Atualizando informações com a API…</p>
  return <div className="realtime-status" data-testid="realtime-status"><p role="status" aria-live="polite">{state.phase === 'syncing' ? 'Atualizando informações com a API…' : state.phase === 'error' ? 'Não foi possível atualizar os dados. Revise a conexão antes de confirmar uma compra.' : 'Tempo real temporariamente indisponível. Os últimos dados foram preservados; a compra aguarda reconciliação.'}</p>{state.phase !== 'syncing' && <Button variant="outline" size="sm" onClick={auth.status === 'error' ? auth.retry : retryRealtime}>{auth.status === 'error' ? 'Verificar sessão' : 'Tentar reconectar'}</Button>}</div>
}
