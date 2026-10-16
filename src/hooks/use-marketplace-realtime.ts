import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-context'
import { initializeMocks } from '@/app/bootstrap'
import { publishRealtime } from '@/services/socket/state'

export function useMarketplaceRealtime(enabled: boolean) {
  const client = useQueryClient()
  const auth = useAuth()
  const verified = auth.status === 'authenticated' || auth.status === 'anonymous'
  const token = auth.status === 'authenticated' ? auth.session!.token : null
  const userId = auth.status === 'authenticated' ? auth.session!.user.id : null
  useEffect(() => {
    if (!enabled || !verified) return
    let active = true
    let disconnect: (() => void) | undefined
    // Socket.IO captures WebSocket on import. Only evaluate it after MSW has
    // installed interception, including when this hook runs in StrictMode.
    void initializeMocks().then(() => import('@/services/socket/synchronize')).then(({ synchronizeMarketplace }) => {
      if (active) disconnect = synchronizeMarketplace(client, token, userId)
    }).catch((error: unknown) => {
      if (active) publishRealtime({ phase: 'offline', error: error instanceof Error ? error.message : 'Não foi possível conectar.' })
    })
    return () => { active = false; disconnect?.() }
  }, [client, enabled, verified, token, userId])
}
