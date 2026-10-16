import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionToken } from './use-session-token'
import { authApi } from '@/services/api/auth'

export function useLogout() {
  const token = useSessionToken()
  const client = useQueryClient()
  const mutation = useMutation({ mutationKey: ['logout', token], mutationFn: authApi.logout, gcTime: 0 })
  return { pending: mutation.isPending, logout: () => { if (!client.isMutating({ mutationKey: ['logout'] })) mutation.mutate() } }
}
