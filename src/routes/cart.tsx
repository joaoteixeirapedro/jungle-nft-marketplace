import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DesignIcon } from '@/components/ui/design-icon'
import { NftCard } from '@/components/nft/nft-card'
import { CartLine } from '@/features/cart/cart-line'
import { useCart, useCartMutation } from '@/features/cart/use-cart'
import { cartFingerprint, cartQuery, quoteKey, quoteQuery, quoteValues } from '@/services/api/cart'
import { catalogQuery } from '@/services/api/catalog'
import { getSessionToken } from '@/lib/session'
import type { Cart, Quote } from '@/types/marketplace'
import '@/features/cart/cart.css'
import { useQuoteExpiry } from '@/hooks/use-quote-expiry'
import { realtimeState, useRealtimeState } from '@/services/socket/state'
import { useAuthNavigation } from '@/features/auth/modal-navigation'

function CartSkeleton() {
  return <div className="cart-layout" role="status" aria-label="Carregando carrinho" data-testid="cart-skeleton"><div className="cart-skeleton-items" aria-hidden="true">{[1, 2, 3].map((key) => <div className="shimmer" key={key} />)}</div><div className="cart-summary" aria-hidden="true"><div className="shimmer h-8" /><div className="shimmer h-32 my-6" /><div className="shimmer h-12" /></div><span className="sr-only">Carregando carrinho e resumo…</span></div>
}
function Recommendations() {
  const query = useQuery(catalogQuery({ sort: 'recent', page: 1, pageSize: 5 }))
  return <section className="cart-recommendations" aria-labelledby="cart-recommendations-title"><h2 id="cart-recommendations-title">Colecionadores também viram</h2>{query.isError ? <p>Não foi possível carregar sugestões. <button onClick={() => void query.refetch()}>Tentar novamente</button></p> : <div className="related-grid">{query.data?.items.map((nft) => <NftCard key={nft.id} nft={nft} />)}</div>}</section>
}
export function CartPage() {
  const cart = useCart()
  const loading = !cart.ready || !cart.data
  const [removal, setRemoval] = useState(0)
  const focusedRemoval = useRef(0)
  useEffect(() => {
    if (focusedRemoval.current === removal || cart.pending || cart.isFetching) return
    const target = document.querySelector<HTMLElement>('.cart-line .cart-remove:not(:disabled), .cart-empty a')
    if (target) { target.focus(); focusedRemoval.current = removal }
  }, [removal, cart.pending, cart.isFetching])
  // Remount presentation on identity changes: drafts, feedback and accepted prices are private too.
  return <section className="cart-page" aria-labelledby="cart-title"><header className="cart-heading"><Link to="/marketplace" aria-label="Voltar ao mercado"><DesignIcon file="0e8e8.svg" loading="eager" /></Link><h1 id="cart-title">Carrinho de NFTs</h1></header><nav className="cart-breadcrumb" aria-label="Caminho de navegação"><Link to="/">Início</Link> / <Link to="/marketplace">Mercado</Link> / Carrinho</nav>
    {cart.ready && cart.isError && <div className="cart-error" role="alert"><h2>Não foi possível carregar o carrinho</h2><p>{cart.error.message} {cart.data && 'Os itens abaixo são a última versão confirmada. Aguarde a recuperação para continuar.'}</p><Button onClick={() => void cart.refetch()}>Tentar novamente</Button></div>}
    {!cart.ready && cart.auth.status === 'error' ? <div role="alert"><p>Não foi possível verificar sua sessão.</p><Button onClick={cart.auth.retry}>Verificar sessão</Button></div> : loading ? !cart.isError && <CartSkeleton /> : cart.data!.items.length ? <CartContents key={cart.token ?? 'guest'} cart={cart.data!} refreshing={cart.isFetching} failed={cart.isError} onRemoved={() => setRemoval((value) => value + 1)} /> : <div className="cart-empty"><h2>Seu carrinho está vazio</h2><p>Explore as coleções e escolha seu próximo NFT.</p><Button asChild><Link to="/marketplace">Explorar NFTs</Link></Button></div>}
    <Recommendations />
  </section>
}

function CartContents({ cart, refreshing, failed, onRemoved }: { cart: Cart; refreshing: boolean; failed: boolean; onRemoved: () => void }) {
  const realtime = useRealtimeState()
  const { token, pending, auth } = useCart()
  const client = useQueryClient()
  const navigate = useNavigate()
  const openAuthentication = useAuthNavigation()
  const change = useCartMutation((operation) => { if (operation.kind === 'remove') onRemoved() })
  const fingerprint = cartFingerprint(cart)
  const options = quoteQuery(token, fingerprint)
  const [coupon, setCoupon] = useState('')
  const [feedback, setFeedback] = useState('')
  const [review, setReview] = useState({ values: '', required: false })
  const [drafts, setDrafts] = useState<Record<string, boolean>>({})
  const onDraft = useCallback((id: string, dirty: boolean) => setDrafts((previous) => previous[id] === dirty ? previous : { ...previous, [id]: dirty }), [])
  const dirty = cart.items.some((item) => drafts[item.id])
  const continuation = useMutation({
    mutationKey: [...quoteKey(token), 'continue'], retry: false,
    mutationFn: async (displayed: Quote) => {
      await client.cancelQueries({ queryKey: quoteKey(token) })
      const latest = await client.fetchQuery(cartQuery(token))
      if (getSessionToken() !== token) return
      if (realtimeState().phase !== 'ready') throw new Error('Aguarde a reconciliação dos dados antes de continuar.')
      const validation = quoteQuery(token, cartFingerprint(latest))
      const fresh = await client.fetchQuery({ ...validation, queryKey: [...validation.queryKey, 'revalidate'] })
      if (getSessionToken() !== token) return
      client.setQueryData(quoteQuery(token, cartFingerprint(latest)).queryKey, fresh)
      if (cartFingerprint(latest) !== fingerprint || quoteValues(fresh) !== quoteValues(displayed)) {
        setReview({ values: quoteValues(fresh), required: true })
        setFeedback('Preço, disponibilidade ou cupom mudou. Revise e aceite os valores atuais antes de continuar.')
        return
      }
      if (!token) { await openAuthentication({ redirect: '/cart' }); return }
      await navigate({ to: '/checkout' })
    },
    onError: async () => { if (token === getSessionToken()) await client.invalidateQueries({ queryKey: ['cart', token] }) },
  })
  const quote = useQuery({ ...options, enabled: !pending && !refreshing && !failed && !continuation.isPending && cart.issues.length === 0 })
  const expired = useQuoteExpiry(quote.data?.expiresAt)
  const values = quote.data ? quoteValues(quote.data) : ''
  if (values && review.values !== values) setReview({ values, required: !!review.values })
  const busy = pending || refreshing || continuation.isPending
  // staleTime=0 means ordinary reads are always revalidated; isInvalidated, rather than age,
  // distinguishes an explicitly obsolete quote while this screen is open.
  const invalidated = client.getQueryState(options.queryKey)?.isInvalidated ?? true
  const canContinue = realtime.phase === 'ready' && !!quote.data && !quote.isFetching && !quote.isError && !expired && !busy && !failed && !dirty && !cart.issues.length && !invalidated && !review.required
  const mutate = (operation: Parameters<typeof change.run>[0]) => {
    setFeedback(''); continuation.reset()
    change.run(operation, () => {
      setFeedback(operation.kind === 'coupon' ? operation.code ? 'Cupom aplicado pela API.' : 'Cupom removido.' : operation.kind === 'remove' ? 'Item removido.' : 'Carrinho atualizado.')
      if (operation.kind === 'coupon') setCoupon('')
    })
  }
  const totals = quote.data && !quote.isError && !cart.issues.length ? quote.data : null
  const updatedMerge = auth.session?.cartMerge
  return <>
    {updatedMerge?.merged && <p className="cart-notice" role="status">Seu carrinho de visitante foi integrado à conta.{updatedMerge.adjustments.length > 0 && ' Algumas quantidades foram ajustadas ao estoque. Revise os itens antes de continuar.'}</p>}
    <div className="cart-layout" aria-busy={busy}>
      <div><div className="cart-columns" aria-hidden="true"><span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span /></div><ul className="cart-items">{cart.items.map((item) => <CartLine key={item.id} item={item} pending={busy || failed} change={mutate} onDraft={onDraft} />)}</ul>
        <p className="cart-feedback" role="status" aria-live="polite">{busy ? 'Atualizando carrinho e cotação…' : feedback}</p>
        {change.isError && <div className="cart-error" role="alert">{change.error.message} O carrinho está sendo conferido com a API; verifique os itens antes de tentar novamente.<button onClick={() => { change.reset(); void client.invalidateQueries({ queryKey: ['cart', token] }) }}>Conferir carrinho</button></div>}
      </div>
      <aside className="cart-summary" aria-labelledby="cart-summary-title"><h2 id="cart-summary-title">Resumo da carteira</h2>
        <form className="cart-coupon" onSubmit={(event) => { event.preventDefault(); if (coupon.trim() && !busy) mutate({ kind: 'coupon', code: coupon.trim() }) }}><label htmlFor="cart-coupon">Código promocional</label><div><input id="cart-coupon" maxLength={40} value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Digite o código promocional..." disabled={busy} aria-describedby="coupon-status" /><Button type="submit" disabled={busy || !coupon.trim()}>Aplicar</Button></div></form>
        <p id="coupon-status" className="cart-coupon-status" role="status">{cart.couponCode && <>{cart.couponStatus === 'valid' ? 'Cupom aplicado' : cart.couponStatus === 'expired' ? 'Cupom expirado' : 'Cupom inválido'}: <strong>{cart.couponCode}</strong> <button disabled={busy} onClick={() => mutate({ kind: 'coupon', code: null })}>Remover cupom</button></>}</p>
        {cart.issues.length > 0 && <div className="cart-error" role="alert"><p>Revise o carrinho antes de continuar.</p>{cart.issues.map((issue, index) => <p key={index}>{issue.message}</p>)}</div>}
        {quote.isPending && !cart.issues.length || (quote.isFetching && !quote.data) ? <div className="cart-summary-skeleton" role="status" data-testid="quote-skeleton"><span className="sr-only">Obtendo cotação…</span><div className="shimmer h-24" /><div className="shimmer h-8 mt-6" /></div> : totals ? <dl className="cart-totals" data-testid="cart-totals" data-quote-id={quote.data?.id} data-current={canContinue} aria-busy={busy || quote.isFetching}><div><dt>Subtotal</dt><dd data-testid="cart-subtotal">{totals.subtotalEth} ETH</dd></div><div><dt>Desconto do lançamento</dt><dd data-testid="cart-discount">(-) {totals.discountEth} ETH</dd></div><div><dt>Taxa de rede</dt><dd>{totals.networkFeeEth} ETH</dd></div><div className="cart-network-note"><dt className="sr-only">Rede de referência</dt><dd>Rede de referência: Ethereum</dd></div><div className="cart-grand-total"><dt>Total</dt><dd data-testid="cart-total">{totals.totalEth} ETH</dd></div></dl> : null}
        {quote.isError && <div className="cart-error" role="alert"><p>Não foi possível obter a cotação: {quote.error.message}</p><Button variant="outline" disabled={busy} onClick={() => void quote.refetch()}>Atualizar cotação</Button></div>}
        {(busy || quote.isFetching) && <p role="status">Atualizando valores. Aguarde a cotação atual.</p>}
        {expired && <p className="cart-error" role="alert">Cotação expirada. Atualize os valores para continuar.</p>}
        {totals && !expired && <p className="cart-quote-expiry">Cotação válida até {new Date(totals.expiresAt).toLocaleTimeString('pt-BR')}. Valores revalidados antes de avançar.</p>}
        {review.required && <div className="cart-notice" role="status"><p>Preço ou disponibilidade atualizados. Revise os itens, descontos, taxas e total.</p><Button variant="outline" disabled={busy || quote.isFetching || quote.isError || expired || !!cart.issues.length} onClick={() => { setReview({ values, required: false }); setFeedback('Valores atuais aceitos para continuar.'); continuation.reset() }}>Aceitar valores atualizados</Button></div>}
        {expired && <Button variant="outline" disabled={busy || quote.isFetching} onClick={() => void quote.refetch()}>Atualizar cotação</Button>}
        {continuation.isError && <p className="cart-error" role="alert">Não foi possível revalidar: {continuation.error.message}. Revise o carrinho e tente novamente.</p>}
        <Button className="cart-continue" disabled={!canContinue} onClick={() => { if (canContinue && quote.data) continuation.mutate(quote.data) }}>{continuation.isPending ? 'Revalidando…' : 'Conectar e finalizar'}</Button>
        <Link to="/marketplace" className="cart-explore">Continuar explorando</Link>
        {!canContinue && !busy && !quote.isFetching && <p className="cart-blocked">{dirty ? 'Confirme ou corrija a quantidade digitada.' : cart.issues.length ? 'Corrija os itens ou o cupom.' : review.required ? 'Aceite os valores atualizados.' : expired ? 'Atualize a cotação expirada.' : 'É necessária uma cotação válida para avançar.'}</p>}
      </aside>
    </div>
  </>
}
