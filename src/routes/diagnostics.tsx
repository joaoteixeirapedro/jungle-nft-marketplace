import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useRealtimeDiagnostics } from '@/hooks/use-realtime-diagnostics'
import { healthQueryOptions } from '@/services/api/health'

const connectionLabels = { connected: 'Conectado', disconnected: 'Desconectado', error: 'Erro de conexão' } as const

export function DiagnosticsPage() {
  const health = useQuery(healthQueryOptions)
  const realtime = useRealtimeDiagnostics()

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Diagnóstico da aplicação</h1>
      <p className="text-muted-foreground">REST e Socket.IO simulados pelo MSW. Nenhum backend separado é necessário.</p>
      <dl className="divide-y rounded-lg border px-5" aria-live="polite">
        <div className="space-y-2 py-5">
          <dt className="font-semibold">React</dt>
          <dd data-testid="react-status">Funcionando</dd>
        </div>
        <div className="space-y-2 py-5">
          <dt className="font-semibold">REST · GET /api/health</dt>
          <dd>
            {health.isPending && <span>Carregando…</span>}
            {health.isError && <p role="alert">{health.error.message}</p>}
            {health.isSuccess && <pre data-testid="health-response" className="overflow-x-auto rounded bg-muted p-3 text-sm">{JSON.stringify(health.data, null, 2)}</pre>}
          </dd>
          <dd><Button variant="outline" size="sm" disabled={health.isFetching} onClick={() => void health.refetch()}>Consultar novamente</Button></dd>
        </div>
        <div className="space-y-2 py-5">
          <dt className="font-semibold">Socket.IO + MSW · transporte WebSocket</dt>
          <dd data-testid="socket-status">{connectionLabels[realtime.status]}</dd>
          {realtime.error && <dd role="alert">{realtime.error}</dd>}
          <dd className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={realtime.status === 'connected'} onClick={realtime.connect}>Conectar</Button>
            <Button variant="outline" size="sm" disabled={realtime.status !== 'connected'} onClick={realtime.disconnect}>Desconectar</Button>
          </dd>
        </div>
        <div className="space-y-2 py-5">
          <dt className="font-semibold">Evento server:ready</dt>
          <dd data-testid="socket-event-status">{realtime.ready ? 'Recebido' : 'Aguardando conexão/evento'}</dd>
          {realtime.ready && <dd><pre data-testid="socket-event" className="overflow-x-auto rounded bg-muted p-3 text-sm">{JSON.stringify(realtime.ready, null, 2)}</pre></dd>}
        </div>
      </dl>
    </>
  )
}
