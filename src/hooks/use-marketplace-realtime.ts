import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-context'
import { synchronizeMarketplace } from '@/services/socket/synchronize'

export function useMarketplaceRealtime(enabled: boolean) {
  const client = useQueryClient()
  const auth = useAuth()
  const verified = auth.status === 'authenticated' || auth.status === 'anonymous'
  const token = auth.status === 'authenticated' ? auth.session!.token : null
  const userId = auth.status === 'authenticated' ? auth.session!.user.id : null
  useEffect(() => {
    if (enabled && verified) return synchronizeMarketplace(client, token, userId)
  }, [client, enabled, verified, token, userId])
}