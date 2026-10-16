import { Outlet, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-context'

export function SessionLoading() { return <section className="session-loading" role="status"><div className="shimmer" /><p>Verificando sessão…</p></section> }
export function ProtectedLayout() {
  const auth = useAuth()
  if (auth.status === 'error') return <SessionFailure retry={auth.retry} />
  return auth.status === 'authenticated' ? <Outlet /> : <SessionLoading />
}
export function SessionFailure({ retry }: { retry?: () => void }) {
  const router = useRouter()
  return <section className="catalog-message" role="alert"><h1>Não foi possível verificar a sessão</h1><p>A sessão foi preservada. Confira sua conexão e tente novamente.</p><Button onClick={retry ?? (() => void router.invalidate())}>Verificar novamente</Button></section>
}
