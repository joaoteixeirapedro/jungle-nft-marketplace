import { useId } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DesignIcon } from '@/components/ui/design-icon'
import { useAuth } from '@/features/auth/auth-context'
import { getSessionToken } from '@/lib/session'
import { safeAuthRedirect } from '@/lib/auth-navigation'
import { ApiError } from '@/services/api/client'
import { changeFavorite, favoritesKey, favoritesQuery, type Favorites } from '@/services/api/favorites'
import type { Nft } from '@/types/marketplace'

export function FavoriteButton({ nft, variant = 'card' }: { nft: Nft; variant?: 'card' | 'detail' | 'mobile' }) {
  const auth = useAuth()
  const token = auth.status === 'authenticated' ? auth.session!.token : null
  const client = useQueryClient()
  const navigate = useNavigate()
  const href = useRouterState({ select: (state) => state.location.href })
  const feedbackId = useId()
  const query = useQuery(favoritesQuery(token))
  const key = favoritesKey(token)
  const pending = useIsMutating({ mutationKey: key }) > 0
  const selected = !!token && !!query.data?.items.some((item) => item.id === nft.id)
  const mutation = useMutation({
    mutationKey: key,
    mutationFn: async (next: boolean) => {
      if (!token || token !== getSessionToken()) throw new Error('A conta ativa mudou. Tente novamente.')
      return changeFavorite(token, nft.id, next)
    },
    onMutate: async (next) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Favorites>(key)
      if (token === getSessionToken() && previous) client.setQueryData<Favorites>(key, { items: next ? [...previous.items.filter((item) => item.id !== nft.id), nft] : previous.items.filter((item) => item.id !== nft.id) })
      return { previous }
    },
    onError: (_error, _next, context) => {
      if (token !== getSessionToken()) return
      if (context?.previous) client.setQueryData(key, context.previous)
    },
    onSuccess: (data) => { if (token === getSessionToken()) client.setQueryData(key, data) },
    onSettled: () => { if (token === getSessionToken()) void client.invalidateQueries({ queryKey: key }) },
  })
  const error = mutation.error ?? query.error
  return <span className={`favorite-control favorite-${variant}`}>
    <button type="button" data-auth-entry={!token ? true : undefined} className={variant === 'card' ? 'nft-favorite' : 'detail-favorite'} aria-label={`${selected ? 'Remover dos favoritos' : 'Favoritar'} ${nft.name}`} aria-pressed={selected} aria-busy={pending || auth.status === 'checking'} aria-describedby={error ? feedbackId : undefined} disabled={auth.status === 'checking' || auth.status === 'error' || auth.status === 'signing-out' || (!!token && (pending || query.isPending || query.isError))} onClick={() => {
      if (!token) { void navigate({ to: '/login', search: { redirect: safeAuthRedirect(href) } }); return }
      if (client.isMutating({ mutationKey: key })) return
      mutation.mutate(!selected)
    }}>
      <DesignIcon file={variant === 'card' ? '364ee.svg' : variant === 'mobile' ? 'e84fc.svg' : 'd427d.svg'} />
      {variant === 'detail' && <span>{selected ? 'Salvo' : 'Favoritar'}</span>}
    </button>
    {error && <span id={feedbackId} className="favorite-error" role="alert">{error instanceof ApiError && error.status === 403 ? 'Sua conta não tem permissão para esta operação.' : 'Não foi possível atualizar favoritos. A alteração foi desfeita.'}{token && query.isError && <button type="button" onClick={() => void query.refetch()}>Tentar novamente</button>}</span>}
  </span>
}
