import { useEffect, useRef } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { AccountLayout } from '@/features/account/layout'
import { CheckoutSkeleton, PurchaseItems, PurchaseTotals } from '@/features/checkout/summary'
import { finishAttempt } from '@/features/checkout/attempt'
import { orderQuery, ordersQuery, receiptQuery, reconcilePurchase } from '@/services/api/checkout'
import { ApiError } from '@/services/api/client'
import { getSessionToken } from '@/lib/session'
import { useAvailability } from '@/hooks/use-availability'
import { networks } from '@/features/catalog/search'
import '@/features/checkout/checkout.css'

const statusLabels = { pending: 'Pagamento pendente', confirmed: 'Pagamento confirmado', declined: 'Pagamento recusado' } as const
export function OrdersPage() {
  const { session } = useAuth()
  const query = useQuery(ordersQuery(session!.token))
  return <AccountLayout title="Meus pedidos" className="orders-page"><h2>Meus pedidos</h2>{query.isPending ? <CheckoutSkeleton /> : query.isError ? <div role="alert"><p>Não foi possível consultar os pedidos: {query.error.message}</p><Button onClick={() => void query.refetch()}>Tentar novamente</Button></div> : <><p className="account-summary" data-testid="account-summary">{query.data.items.length} pedidos nesta conta</p><ul className="orders-list">{query.data.items.map((order) => <li key={order.id}><Link to="/orders/$orderId" params={{ orderId: order.id }} preload={false}><strong>{order.id}</strong><span>{statusLabels[order.status]}</span><span>{order.totalEth} ETH</span><span>{new Date(order.createdAt).toLocaleString('pt-BR')}</span></Link></li>)}</ul>{!query.data.items.length && <p>Nenhum pedido nesta conta. <Link to="/marketplace">Explorar NFTs</Link></p>}</> }</AccountLayout>
}
export function OrderPage() {
  const { session } = useAuth()
  const token = session!.token
  const { orderId } = useParams({ from: '/_authenticated/orders/$orderId' })
  const query = useQuery(orderQuery(token, orderId))
  const receipt = useQuery({ ...receiptQuery(token, orderId), enabled: query.data?.status === 'confirmed' && !query.isError })
  const client = useQueryClient()
  const synced = useRef('')
  const notice = useAvailability()
  useEffect(() => {
    const order = query.data
    if (!order || token !== getSessionToken() || synced.current === `${order.id}:${order.version}`) return
    synced.current = `${order.id}:${order.version}`
    if (order.status !== 'pending') {
      try { finishAttempt(session!.user.id, order.id) }
      catch { notice('O resultado está preservado na API, mas não foi possível limpar a referência local da tentativa. Consulte seus pedidos antes de iniciar outra compra.') }
      void reconcilePurchase(client, token, order)
    }
  }, [query.data, token, session, client, notice])
  const forbidden = query.error instanceof ApiError && query.error.status === 403
  const missing = query.error instanceof ApiError && query.error.status === 404
  return <section className="order-page" aria-labelledby="order-title"><div className="order-navigation"><Link to="/orders">Meus pedidos</Link><span>Conta: <strong data-testid="account-identity">{session!.user.username}</strong></span><Link to="/marketplace">Voltar ao mercado</Link></div>
    {query.isError && query.data && <div className="purchase-error" role="alert"><h2>Não foi possível consultar o pedido</h2><p>A última resposta confirmada foi preservada. {query.error.message}</p><Button onClick={() => void query.refetch()}>Verificar pedido</Button></div>}{query.isPending ? <><h1 id="order-title">Consultando pedido</h1><CheckoutSkeleton /></> : query.isError && !query.data ? <div className="purchase-error" role="alert"><h1 id="order-title">{forbidden ? 'Acesso não permitido' : missing ? 'Pedido não encontrado' : 'Não foi possível consultar o pedido'}</h1><p>{query.error.message}</p>{!forbidden && !missing && <Button onClick={() => void query.refetch()}>Verificar pedido</Button>}</div> : query.data.status === 'confirmed' ? <article className="order-receipt" data-testid="order-receipt"><Link className="receipt-close" to="/orders" aria-label="Fechar recibo">×</Link><div className="receipt-thanks" aria-hidden="true"><img src="/assets/figma/checkout-thank-you.svg" alt="" /></div><h1 id="order-title">Compra confirmada</h1><p className="receipt-subtitle">Seus NFTs foram confirmados na carteira simulada.</p>
      {receipt.isPending ? <div className="shimmer receipt-skeleton" role="status"><span className="sr-only">Carregando recibo da API…</span></div> : receipt.isError ? <div role="alert"><p>O pagamento está confirmado, mas não foi possível obter o recibo: {receipt.error.message}</p><Button onClick={() => void receipt.refetch()}>Carregar recibo</Button></div> : <>
        <dl className="receipt-metadata"><div><dt>Nº do pedido</dt><dd>{receipt.data.orderId}</dd></div><div><dt>Data</dt><dd>{new Date(receipt.data.confirmedAt).toLocaleString('pt-BR')}</dd></div><div><dt>Total</dt><dd>{receipt.data.totalEth} ETH</dd></div><div><dt>Carteira</dt><dd>{receipt.data.wallet.displayName}</dd></div></dl>
        <div className="receipt-details"><h2>Detalhes da transação</h2><p className="receipt-transaction" data-testid="transaction-id">{receipt.data.transactionId}</p><PurchaseItems items={receipt.data.items} /><PurchaseTotals totals={receipt.data} couponCode={receipt.data.couponCode} /><dl className="receipt-collector"><div><dt>Colecionador</dt><dd>{receipt.data.collector.displayName} · {receipt.data.collector.username}</dd></div><div><dt>E-mail</dt><dd>{receipt.data.collector.email}</dd></div><div><dt>Perfil</dt><dd>{receipt.data.collector.profileName}</dd></div><div><dt>Rede</dt><dd>{networks[receipt.data.network]}</dd></div><div><dt>Endereço</dt><dd>{receipt.data.wallet.address}</dd></div></dl>
        <p>Transação e referência simuladas. Este recibo preserva os valores registrados no pedido.</p><Button onClick={() => notice(`Referência simulada: ${receipt.data.transactionId}. Não há transação real para consultar no Etherscan.`)}>Ver no Etherscan (simulado)</Button></div>
      </>}
    </article> : <article className="order-state" data-testid="order-state"><h1 id="order-title">{statusLabels[query.data.status]}</h1><p>Pedido {query.data.id}</p><p role="status">{query.data.status === 'pending' ? 'Aguardando resultado da API simulada. Você pode atualizar a página ou voltar depois; nenhuma nova compra será criada.' : query.data.declineReason}</p><PurchaseItems items={query.data.items} /><PurchaseTotals totals={query.data} couponCode={query.data.couponCode} />{query.data.status === 'pending' ? !query.isError && <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Verificar pedido</Button> : <><p>Os itens permanecem no carrinho. Uma nova tentativa exige nova revisão.</p><Button asChild><Link to="/cart">Revisar carrinho</Link></Button></>}</article>}
  </section>
}

