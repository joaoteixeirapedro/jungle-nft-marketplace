import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DesignIcon } from '@/components/ui/design-icon'
import { useAuth } from '@/features/auth/auth-context'
import { PurchaseItems, PurchaseTotals, CheckoutSkeleton } from '@/features/checkout/summary'
import { collectorPayload, discardRejectedAttempt, readAttempt, readDraft, validateCollector, writeAttempt, writeDraft, type PurchaseAttempt } from '@/features/checkout/attempt'
import { cartFingerprint, cartQuery, quoteKey, quoteQuery, quoteValues } from '@/services/api/cart'
import { checkoutApi, reconcilePurchase, walletsQuery } from '@/services/api/checkout'
import { sessionQuery } from '@/services/api/auth'
import { ApiError } from '@/services/api/client'
import { getSessionToken } from '@/lib/session'
import { useQuoteExpiry } from '@/hooks/use-quote-expiry'
import { networks } from '@/features/catalog/search'
import type { Cart, CollectorDetails, Network, Order, Quote, SessionResponse, Wallet } from '@/types/marketplace'
import '@/features/checkout/checkout.css'
import { realtimeState, useRealtimeState } from '@/services/socket/state'

interface Review { quote: Quote; collector: CollectorDetails; wallet: Wallet }
const definitiveRejections = new Set(['QUOTE_EXPIRED', 'QUOTE_CHANGED', 'QUOTE_CONTEXT_CHANGED', 'QUOTE_NOT_FOUND', 'WALLET_DISCONNECTED', 'WALLET_NOT_FOUND', 'INSUFFICIENT_STOCK', 'COUPON_INVALID', 'COUPON_EXPIRED', 'VALIDATION_ERROR', 'NETWORK_MISMATCH', 'MALFORMED_JSON'])

export function CheckoutPage() {
  const { session } = useAuth()
  const token = session!.token
  const cart = useQuery(cartQuery(token))
  const wallets = useQuery(walletsQuery(token))
  return <section className="checkout-page" aria-labelledby="checkout-title"><header className="purchase-heading"><Link to="/cart" aria-label="Voltar ao carrinho"><DesignIcon file="0e8e8.svg" /></Link><h1 id="checkout-title">Pagamento com carteira</h1></header><nav className="purchase-breadcrumb" aria-label="Caminho de navegação"><Link to="/">Início</Link> / <Link to="/cart">Carrinho</Link> / Pagamento</nav>
    {cart.isPending || wallets.isPending ? <CheckoutSkeleton /> : cart.isError || wallets.isError ? <div className="purchase-error" role="alert"><h2>Não foi possível preparar o checkout</h2><p>{cart.error?.message ?? wallets.error?.message}</p><Button onClick={() => { void cart.refetch(); void wallets.refetch() }}>Tentar novamente</Button><Link to="/cart">Revisar carrinho</Link></div> : <CheckoutFlow key={token} session={session!} cart={cart.data} wallets={wallets.data.items} refreshing={cart.isFetching || wallets.isFetching} />}
  </section>
}

function CheckoutFlow({ session, cart, wallets, refreshing }: { session: SessionResponse; cart: Cart; wallets: Wallet[]; refreshing: boolean }) {
  const realtime = useRealtimeState()
  const token = session.token
  const userId = session.user.id
  const auth = useAuth()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [stored] = useState(() => {
    try { return { attempt: readAttempt(userId), draft: readDraft(userId), error: '' } }
    catch (error) { return { attempt: null, draft: null, error: error instanceof Error ? error.message : 'Não foi possível recuperar a tentativa.' } }
  })
  const [attempt, setAttempt] = useState<PurchaseAttempt | null>(stored.attempt)
  const initialWallet = wallets.find((wallet) => wallet.id === (stored.draft?.walletId ?? session.connection?.walletId)) ?? wallets.find((wallet) => wallet.role === 'primary') ?? wallets[0]
  const [walletId, setWalletId] = useState(stored.draft?.walletId ?? initialWallet?.id ?? '')
  const [network, setNetwork] = useState<Network>(stored.draft?.network ?? initialWallet?.network ?? 'ethereum')
  const [collector, setCollector] = useState<CollectorDetails>(stored.draft?.collector ?? { displayName: session.user.displayName, username: session.user.username, email: session.user.email, profileName: initialWallet?.profileName ?? session.user.username, ens: session.user.ens, referralCode: initialWallet?.referralCode, secondaryAddress: initialWallet?.secondaryAddress, notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [review, setReview] = useState<Review | null>(null)
  const [showCollector, setShowCollector] = useState(false)
  const [showItems, setShowItems] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const confirming = useRef(false)
  const wallet = wallets.find((item) => item.id === walletId)
  const compatible = !!wallet && wallet.network === network
  const context = { walletId, network }
  const fingerprint = cartFingerprint(cart)
  const options = quoteQuery(token, fingerprint, context)
  const submitting = useIsMutating({ mutationKey: ['orders', token, 'create'] }) > 0
  const quote = useQuery({ ...options, enabled: !submitting && !attempt && !stored.error && !refreshing && compatible && cart.items.length > 0 && cart.issues.length === 0 })
  const expired = useQuoteExpiry(quote.data?.expiresAt)
  const connected = auth.session?.connection?.connected && auth.session.connection.walletId === walletId && auth.session.connection.network === network
  useEffect(() => {
    const modal = dialog.current
    if (!modal) return
    if (review) {
      if (!modal.open) modal.showModal()
      modal.querySelector<HTMLButtonElement>('[data-review-cancel]')?.focus()
    } else if (modal.open) modal.close()
  }, [review])
  const persistDraft = (value: CollectorDetails, id = walletId, selectedNetwork = network) => {
    try { writeDraft(userId, { walletId: id, network: selectedNetwork, collector: value }) }
    catch { setNotice('Não foi possível salvar o rascunho para um refresh. Não envie a compra sem conseguir preservar sua tentativa.') }
  }
  const connection = useMutation({
    mutationKey: ['wallets', token, 'connection'], retry: false,
    mutationFn: async (disconnect: boolean) => {
      if (getSessionToken() !== token || !wallet || !compatible) throw new Error('Revise a carteira e a rede.')
      await client.cancelQueries({ queryKey: quoteKey(token) })
      if (disconnect) await checkoutApi.disconnect(token, walletId)
      else await checkoutApi.connect(token, walletId, network)
    },
    onSettled: async () => {
      if (getSessionToken() !== token) return
      await client.invalidateQueries({ queryKey: ['session', token] })
      await client.invalidateQueries({ queryKey: quoteKey(token) })
    },
  })
  const purchase = useMutation({
    mutationKey: ['orders', token, 'create'], retry: false,
    mutationFn: async (input: { recover: PurchaseAttempt } | { review: Review }): Promise<Order | null> => {
      if (getSessionToken() !== token) return null
      let intent: PurchaseAttempt
      if ('recover' in input) intent = input.recover
      else {
        const previous = readAttempt(userId)
        if (previous) { setAttempt(previous); return null }
        const accepted = input.review
        if (Date.parse(accepted.quote.expiresAt) <= Date.now()) throw new ApiError('A cotação expirou. Atualize os valores e revise novamente.', 409, 'QUOTE_EXPIRED')
        await client.cancelQueries({ queryKey: quoteKey(token) })
        const currentSession = await client.fetchQuery({ ...sessionQuery(token), staleTime: 0 })
        const currentWallets = await client.fetchQuery(walletsQuery(token))
        const currentWallet = currentWallets.items.find((item) => item.id === accepted.wallet.id)
        if (!currentWallet || currentWallet.version !== accepted.wallet.version || currentWallet.network !== accepted.quote.network) throw new ApiError('A carteira mudou. Selecione e revise novamente.', 409, 'QUOTE_CONTEXT_CHANGED')
        if (!currentSession.connection?.connected || currentSession.connection.walletId !== currentWallet.id || currentSession.connection.network !== accepted.quote.network) throw new ApiError('Conecte a carteira selecionada antes de confirmar.', 409, 'WALLET_DISCONNECTED')
        const latest = await client.fetchQuery(cartQuery(token))
        const validation = quoteQuery(token, cartFingerprint(latest), { walletId: currentWallet.id, network: currentWallet.network })
        const fresh = await client.fetchQuery({ ...validation, queryKey: [...validation.queryKey, 'confirmation'] })
        if (getSessionToken() !== token) return null
        if (realtimeState().phase !== 'ready') throw new Error('A conexão está sendo reconciliada. Revise os dados antes de confirmar.')
        client.setQueryData(validation.queryKey, fresh)
        if (quoteValues(fresh) !== quoteValues(accepted.quote)) { setNotice('Os itens, preços, disponibilidade, cupom ou taxas mudaram. Revise os valores atualizados e confirme novamente.'); setReview(null); return null }
        intent = { key: crypto.randomUUID(), payload: { quoteId: fresh.id, walletId: currentWallet.id, network: currentWallet.network, collector: accepted.collector } }
        writeAttempt(userId, intent) // Persist BEFORE sending: refresh/timeout must retain this exact body/key.
        setAttempt(intent)
        setReview(null)
      }
      const order = await checkoutApi.createOrder(token, intent.key, intent.payload)
      if (getSessionToken() !== token) return null
      const known = { ...intent, orderId: order.id }
      writeAttempt(userId, known)
      setAttempt(known)
      return order
    },
    onSuccess: async (order) => {
      if (!order || getSessionToken() !== token) return
      await reconcilePurchase(client, token, order)
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onError: async (error) => {
      if (getSessionToken() !== token) return
      setReview(null)
      const current = readAttempt(userId)
      if (error instanceof ApiError && definitiveRejections.has(error.code) && current && !current.orderId) { discardRejectedAttempt(userId, current.key); setAttempt(null) }
      await client.invalidateQueries({ queryKey: ['cart', token] })
      await client.invalidateQueries({ queryKey: quoteKey(token), refetchType: 'none' })
    },
    onSettled: () => { confirming.current = false },
  })
  const busy = purchase.isPending || connection.isPending || refreshing
  const invalidated = client.getQueryState(options.queryKey)?.isInvalidated ?? true
  const validQuote = !!quote.data && !quote.isFetching && !quote.isError && !expired && !invalidated && !cart.issues.length
  const canReview = realtime.phase === 'ready' && !busy && compatible && !!connected && validQuote
  const beginReview = () => {
    const problems = validateCollector(collector)
    setErrors(problems)
    if (Object.keys(problems).length) { setShowCollector(true); requestAnimationFrame(() => document.querySelector<HTMLElement>('.checkout-form [aria-invalid="true"]')?.focus()); return }
    if (canReview && quote.data && wallet) { purchase.reset(); setReview({ quote: quote.data, collector: collectorPayload(collector), wallet: { ...wallet } }) }
  }
  const reviewStale = !!review && !!quote.data && quoteValues(review.quote) !== quoteValues(quote.data)
  const submit = () => { if (review && canReview && !reviewStale && !confirming.current) { confirming.current = true; purchase.mutate({ review }) } }
  if (stored.error) return <div className="purchase-error" role="alert"><h2>Não foi possível recuperar a tentativa</h2><p>{stored.error}</p><Link to="/orders">Consultar meus pedidos</Link></div>
  if (attempt) return <div className="purchase-recovery" role="status"><h2>{purchase.isPending ? 'Processando tentativa de compra' : attempt.orderId ? 'Pedido enviado' : 'Verificando resultado da tentativa'}</h2><p>{attempt.orderId ? 'Consulte o pedido para acompanhar o pagamento simulado.' : 'A resposta pode não ter chegado. A mesma tentativa foi preservada; recupere o resultado antes de iniciar outra compra.'}</p>{purchase.isError && <p role="alert">{purchase.error.message}</p>}{attempt.orderId ? <Button asChild><Link to="/orders/$orderId" params={{ orderId: attempt.orderId }}>Consultar pedido</Link></Button> : <Button disabled={purchase.isPending} onClick={() => { if (!confirming.current) { confirming.current = true; purchase.mutate({ recover: attempt }) } }}>{purchase.isPending ? 'Verificando…' : 'Recuperar mesma tentativa'}</Button>}<Link to="/orders">Meus pedidos</Link></div>
  if (!cart.items.length) return <div className="purchase-empty"><h2>Seu carrinho está vazio</h2><p>Escolha um NFT antes de iniciar o pagamento.</p><Button asChild><Link to="/marketplace">Explorar NFTs</Link></Button></div>
  return <>
    <p className="purchase-account">Conta: <strong data-testid="account-identity">{session.user.username}</strong></p>
    <p className="purchase-intro">Revise os dados e confirme sua intenção antes do envio.</p>
    {notice && <p className="purchase-notice" role="status">{notice}</p>}
    <div className="checkout-layout" aria-busy={busy}>
      <form id="checkout-form" className="checkout-form" data-expanded={showCollector} noValidate onSubmit={(event) => { event.preventDefault(); beginReview() }}>
        <h2>Informações do colecionador</h2><button type="button" className="collector-toggle" aria-expanded={showCollector} aria-controls="collector-fields" onClick={() => setShowCollector((value) => !value)}>{showCollector ? 'Ocultar dados' : 'Revisar ou editar dados'}</button><p>Campos com * são obrigatórios.</p><div id="collector-fields" className="collector-grid">{([
          ['displayName', 'Nome de exibição', 80, true], ['username', 'Nome de usuário', 32, true], ['profileName', 'Nome do perfil', 80, true], ['email', 'E-mail', 254, true], ['ens', 'Nome ENS', 255, false], ['referralCode', 'Código de indicação', 80, false], ['secondaryAddress', 'Endereço secundário', 80, false],
        ] as const).map(([field, label, max, required]) => <label className="checkout-field" key={field} htmlFor={`collector-${field}`}><span id={`label-${field}`}>{label}{required ? ' *' : ' (opcional)'}</span><input id={`collector-${field}`} name={field} aria-labelledby={`label-${field}`} type={field === 'email' ? 'email' : 'text'} autoComplete={field === 'email' ? 'email' : field === 'displayName' ? 'name' : field === 'username' ? 'username' : 'off'} maxLength={max} value={collector[field] ?? ''} required={required} disabled={busy} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `error-${field}` : undefined} onChange={(event) => { const next = { ...collector, [field]: event.target.value }; setCollector(next); persistDraft(next); setErrors((old) => ({ ...old, [field]: '' })) }} />{errors[field] && <span className="field-error" id={`error-${field}`} role="alert">{errors[field]}</span>}</label>)}
          <label className="checkout-field checkout-notes" htmlFor="collector-notes"><span>Observação do colecionador (opcional)</span><textarea id="collector-notes" maxLength={2000} value={collector.notes ?? ''} disabled={busy} onChange={(event) => { const next = { ...collector, notes: event.target.value }; setCollector(next); persistDraft(next) }} /></label></div>
      </form>
      <aside className="checkout-summary" aria-labelledby="checkout-summary-title"><h2 id="checkout-summary-title">Resumo da compra</h2><button type="button" className="checkout-items-toggle" aria-controls="checkout-items" aria-expanded={showItems} onClick={() => setShowItems((value) => !value)}>{showItems ? 'Ocultar NFTs' : 'Revisar NFTs e edições'}</button><div className="checkout-items" id="checkout-items" data-expanded={showItems}><PurchaseItems items={cart.items} /></div>
        <Link className="checkout-coupon-link" to="/cart">Tem um código promocional? Aplique no carrinho</Link>
        {cart.issues.length > 0 && <div className="purchase-error" role="alert"><p>Revise os itens ou cupom no carrinho antes de confirmar.</p>{cart.issues.map((issue, index) => <p key={index}>{issue.message}</p>)}<Link to="/cart">Corrigir carrinho</Link></div>}
        {!quote.isError && compatible && !cart.issues.length && (quote.isPending || quote.isFetching) ? <div className="shimmer checkout-quote-skeleton" role="status"><span className="sr-only">Atualizando cotação…</span></div> : !quote.data || quote.isError || !compatible ? null : <><PurchaseTotals totals={quote.data} couponCode={quote.data.couponCode} /><p className="purchase-expiry">Cotação {quote.data.id} · válida até {new Date(quote.data.expiresAt).toLocaleTimeString('pt-BR')}</p></>}
        {quote.isError && <div className="purchase-error" role="alert">Não foi possível obter cotação: {quote.error.message} <Button variant="outline" disabled={busy} onClick={() => void quote.refetch()}>Atualizar cotação</Button></div>}
        {expired && <div className="purchase-error" role="alert">Cotação expirada. Atualize e revise os valores.<Button variant="outline" disabled={busy || quote.isFetching} onClick={() => void quote.refetch()}>Atualizar cotação</Button></div>}
        <fieldset className="checkout-wallets" disabled={busy}><legend>Carteira e rede</legend>{wallets.length ? wallets.map((item) => <label className="wallet-choice" key={item.id} data-selected={walletId === item.id}><input type="radio" name="checkout-wallet" value={item.id} checked={walletId === item.id} onChange={() => { setWalletId(item.id); setNetwork(item.network); persistDraft(collector, item.id, item.network); setNotice('Carteira alterada. Conecte e revise a cotação atual.'); setReview(null); connection.reset() }} /><span className="wallet-brand" aria-hidden="true">{item.type === 'walletconnect' ? 'W' : item.type === 'metamask' ? 'M' : 'C'}</span><span><strong>{item.displayName}</strong><small>{item.address}</small><small>{networks[item.network]} · {item.type}</small></span></label>) : <p>Nenhuma carteira cadastrada. <Link to="/wallets">Consultar carteiras</Link></p>}
          <label className="checkout-field" htmlFor="checkout-network"><span id="checkout-network-label">Rede</span><select aria-labelledby="checkout-network-label" id="checkout-network" value={network} onChange={(event) => { const next = event.target.value as Network; setNetwork(next); persistDraft(collector, walletId, next); setReview(null) }}>{Object.entries(networks).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        </fieldset>
        {!compatible && <p className="purchase-error" role="alert">Selecione uma carteira autorizada e sua rede cadastrada.</p>}
        {connection.isError && <p className="purchase-error" role="alert">{connection.error.message}</p>}
        <p className="connection-status" role="status">{connection.isPending ? 'Atualizando conexão simulada…' : connected ? 'Carteira conectada na simulação' : 'Carteira desconectada'}</p>
        <Button variant="outline" className="wallet-connect" disabled={busy || !compatible} onClick={() => connection.mutate(!!connected)}>{connected ? 'Desconectar carteira' : 'Conectar carteira simulada'}</Button>
        {purchase.isError && <div className="purchase-error" role="alert">{purchase.error.message} Revise os dados antes de tentar novamente.</div>}
        <Button className="checkout-review" type="submit" form="checkout-form" disabled={!canReview}>Revisar compra</Button>
        {!canReview && <p className="purchase-blocked">{!connected ? 'Conecte a carteira selecionada para continuar.' : cart.issues.length ? 'Corrija o carrinho.' : expired ? 'Atualize a cotação expirada.' : 'Aguarde uma cotação válida e atualizada.'}</p>}
        <Link to="/cart" className="purchase-back">Voltar ao carrinho</Link>
      </aside>
    </div>
    <dialog className="purchase-review-dialog" ref={dialog} aria-labelledby="purchase-review-title" onClose={() => setReview(null)}><h2 id="purchase-review-title">Revisar compra simulada</h2>{review && <><p>{review.collector.displayName} · {review.collector.email}</p><p>Usuário: {review.collector.username} · Perfil: {review.collector.profileName}</p><p>Carteira {review.wallet.displayName} · {networks[review.quote.network]}</p><PurchaseItems items={review.quote.items} /><PurchaseTotals totals={review.quote} couponCode={review.quote.couponCode} /><p>A confirmação envia uma compra simulada. Nenhum ativo real é transferido.</p></>}{(reviewStale || expired || cart.issues.length > 0) && <p className="purchase-error" role="alert">A cotação mudou ou ficou inválida. Volte à edição e revise os dados atuais.</p>}<div className="review-actions"><Button data-review-cancel variant="outline" disabled={purchase.isPending} onClick={() => dialog.current?.close()}>Voltar à edição</Button><Button disabled={!canReview || reviewStale || purchase.isPending} onClick={submit}>{purchase.isPending ? 'Revalidando…' : 'Confirmar compra simulada'}</Button></div></dialog>
  </>
}

