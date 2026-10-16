import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-context'
import { useSessionToken } from '@/hooks/use-session-token'
import { getSessionToken } from '@/lib/session'
import { cartApi, cartKey, cartQuery, quoteKey, type CartOperation } from '@/services/api/cart'

export function useCart() {
  const auth = useAuth()
  const token = useSessionToken()
  const ready = auth.status === 'anonymous' || auth.status === 'authenticated'
  const query = useQuery({ ...cartQuery(token), enabled: ready })
  const pending = useIsMutating({ mutationKey: cartKey(token) }) > 0
  return { ...query, token, ready, pending, auth }
}
export function useCartMutation(onConfirmed?: (operation: CartOperation) => void) {
  const token = useSessionToken()
  const client = useQueryClient()
  const key = cartKey(token)
  const mutation = useMutation({
    mutationKey: [...key, 'mutation'], scope: { id: `cart:${token ?? 'guest'}` }, retry: false,
    onMutate: async () => {
      await Promise.all([client.cancelQueries({ queryKey: key }), client.cancelQueries({ queryKey: quoteKey(token) })])
      await client.invalidateQueries({ queryKey: quoteKey(token), refetchType: 'none' })
    },
    mutationFn: (operation: CartOperation) => {
      if (token !== getSessionToken()) throw new Error('A sessão mudou. Reabra seu carrinho.')
      return cartApi.change(token, operation)
    },
    onSuccess: (cart, operation) => {
      if (token !== getSessionToken()) return
      client.setQueryData(key, cart)
      // Hook-level lifecycle also runs when removing the last line unmounts its observer.
      onConfirmed?.(operation)
    },
    onSettled: async () => {
      // Also reconcile ambiguous failures (e.g. a lost response after a committed mutation).
      if (token === getSessionToken()) await client.invalidateQueries({ queryKey: key })
    },
  })
  const run = (operation: CartOperation, onSuccess?: () => void) => {
    if (client.isMutating({ mutationKey: key }) || token !== getSessionToken()) return
    mutation.mutate(operation, { onSuccess: () => { if (token === getSessionToken()) onSuccess?.() } })
  }
  return { ...mutation, run }
}
