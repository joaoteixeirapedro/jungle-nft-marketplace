import type { CollectorDetails, CreateOrderRequest, Order, OrderStatus, Totals } from '../../types/marketplace.ts'
import { email, invalid, MockError, record, text } from '../errors.ts'
import type { MockDatabase, StoredOrder } from '../state/model.ts'
import { nextId, now, type DomainEvent } from '../state/store.ts'
import { emitNft, findEdition, findNft } from './catalog.ts'
import { assertStock, lineId, quoteFingerprint, storedCart } from './cart.ts'
import { type Identity, requireSession } from './session.ts'
import { findWallet, network } from './wallets.ts'

export function parseOrder(body: unknown): CreateOrderRequest {
  const input = record(body)
  const raw = record(input.collector)
  const collector: CollectorDetails = { displayName: text(raw.displayName, 'displayName', 80), username: text(raw.username, 'username', 32), email: email(raw.email), profileName: text(raw.profileName, 'profileName', 80) }
  if (raw.ens !== undefined) collector.ens = raw.ens === null ? null : text(raw.ens, 'ens', 255)
  if (raw.referralCode !== undefined) collector.referralCode = text(raw.referralCode, 'referralCode', 80)
  if (raw.secondaryAddress !== undefined) collector.secondaryAddress = raw.secondaryAddress === null ? null : text(raw.secondaryAddress, 'secondaryAddress', 80)
  if (raw.notes !== undefined) {
    if (typeof raw.notes !== 'string' || raw.notes.length > 2000) invalid('notes', 'Use até 2000 caracteres.')
    collector.notes = raw.notes
  }
  return { quoteId: text(input.quoteId, 'quoteId'), walletId: text(input.walletId, 'walletId'), network: network(input.network), collector }
}
const totals = (value: Totals): Totals => ({ subtotalEth: value.subtotalEth, discountEth: value.discountEth, networkFeeEth: value.networkFeeEth, totalEth: value.totalEth })

function emitOrder(db: MockDatabase, events: DomainEvent[], stored: StoredOrder) {
  events.push({ type: 'order.updated', payload: { id: nextId(db, 'event'), resourceId: stored.order.id, version: stored.order.version, occurredAt: new Date(now(db)).toISOString(), userId: stored.userId, data: structuredClone(stored.order) } })
}

export function settleOrder(db: MockDatabase, events: DomainEvent[], id: string, status: Exclude<OrderStatus, 'pending'>) {
  const stored = db.orders[id]
  if (!stored) throw new MockError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.')
  const order = stored.order
  if (order.status === status) return order
  if (order.status !== 'pending') throw new MockError(409, 'ORDER_TERMINAL', 'Pedidos confirmados ou recusados são terminais.')
  for (const line of order.items) {
    const nft = findNft(db, line.nftId)
    const edition = findEdition(nft, line.editionId)
    edition.reserved -= line.quantity
    if (status === 'confirmed') edition.sold += line.quantity
    nft.version++
    emitNft(db, events, nft)
  }
  order.status = status
  order.version++
  stored.settleAt = null
  stored.settlement = null
  if (status === 'confirmed') {
    order.receipt = { orderId: order.id, transactionId: `simulated-tx-${order.id}`, simulated: true, confirmedAt: new Date(now(db)).toISOString(), items: structuredClone(order.items), wallet: structuredClone(order.wallet), collector: structuredClone(order.collector), couponCode: order.couponCode, network: order.network, ...totals(order) }
    const cart = storedCart(db, `user:${stored.userId}`)
    for (const bought of order.items) {
      const current = cart.items.find((line) => lineId(line) === bought.id)
      if (current) current.quantity = Math.max(0, current.quantity - bought.quantity)
    }
    cart.items = cart.items.filter((line) => line.quantity > 0)
    cart.version++
  } else order.declineReason = 'Pagamento recusado na simulação.'
  emitOrder(db, events, stored)
  return order
}

export function settleIfDue(db: MockDatabase, events: DomainEvent[], stored: StoredOrder) {
  if (stored.order.status === 'pending' && stored.settlement && stored.settleAt !== null && stored.settleAt <= now(db)) settleOrder(db, events, stored.order.id, stored.settlement)
}
export function ownedOrder(db: MockDatabase, events: DomainEvent[], token: string | null, id: string) {
  const session = requireSession(db, token)
  const stored = db.orders[id]
  if (!stored) throw new MockError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.')
  if (stored.userId !== session.userId) throw new MockError(403, 'FORBIDDEN', 'Este pedido pertence a outro usuário.')
  settleIfDue(db, events, stored)
  return stored.order
}

export function createOrder(db: MockDatabase, events: DomainEvent[], identity: Identity, input: CreateOrderRequest, key: string | null) {
  const session = requireSession(db, identity.token)
  if (!key || !/^[\w.:-]{1,128}$/.test(key)) throw new MockError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Envie uma Idempotency-Key de até 128 caracteres.')
  const identityKey = `${session.userId}|${key}`
  const fingerprint = JSON.stringify(input)
  const replay = db.idempotency[identityKey]
  if (replay) {
    if (replay.fingerprint !== fingerprint) throw new MockError(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave já foi usada com outro conteúdo.')
    return { order: ownedOrder(db, events, identity.token, replay.orderId), replayed: true }
  }
  const storedQuote = db.quotes[input.quoteId]
  if (!storedQuote) throw new MockError(404, 'QUOTE_NOT_FOUND', 'Cotação não encontrada.')
  if (storedQuote.owner !== `user:${session.userId}`) throw new MockError(403, 'FORBIDDEN', 'Esta cotação pertence a outro usuário.')
  const quote = storedQuote.quote
  if (Date.parse(quote.expiresAt) <= now(db)) throw new MockError(409, 'QUOTE_EXPIRED', 'A cotação expirou. Atualize e revise os valores.')
  const wallet = findWallet(db, session.userId, input.walletId)
  if (wallet.network !== input.network || quote.network !== input.network || quote.walletId !== wallet.id) throw new MockError(409, 'QUOTE_CONTEXT_CHANGED', 'Carteira ou rede alterada. Solicite e revise uma nova cotação.')
  if (!session.connection?.connected || session.connection.walletId !== wallet.id || session.connection.network !== input.network) throw new MockError(409, 'WALLET_DISCONNECTED', 'Conecte a carteira selecionada antes de confirmar.')
  const cart = storedCart(db, `user:${session.userId}`)
  if (storedQuote.fingerprint !== quoteFingerprint(db, cart, input.network, wallet.id)) throw new MockError(409, 'QUOTE_CHANGED', 'Os valores ou itens mudaram. Solicite uma nova cotação e confirme novamente.')
  for (const line of quote.items) assertStock(db, line)
  const order: Order = { id: nextId(db, 'order'), status: 'pending', version: 1, createdAt: new Date(now(db)).toISOString(), items: structuredClone(quote.items), network: input.network, wallet: structuredClone(wallet), collector: structuredClone(input.collector), couponCode: quote.couponCode, receipt: null, declineReason: null, ...totals(quote) }
  const outcome = db.scenario.name === 'payment-pending' ? null : db.scenario.name === 'payment-declined' ? 'declined' : 'confirmed'
  const stored: StoredOrder = { userId: session.userId, order, settlement: outcome, settleAt: outcome ? now(db) + 1000 : null }
  for (const line of quote.items) {
    const nft = findNft(db, line.nftId)
    findEdition(nft, line.editionId).reserved += line.quantity
    nft.version++
    emitNft(db, events, nft)
  }
  db.orders[order.id] = stored
  db.idempotency[identityKey] = { fingerprint, orderId: order.id }
  emitOrder(db, events, stored)
  return { order, replayed: false }
}
