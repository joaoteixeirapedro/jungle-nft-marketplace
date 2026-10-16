import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { formatEth, parseEth, sumEth } from '../../src/lib/eth.ts'
import { createFixtures } from '../../src/mocks/data/marketplace.ts'
import { login, changePassword } from '../../src/mocks/domain/accounts.ts'
import { listNfts, nftDetail, updateNft } from '../../src/mocks/domain/catalog.ts'
import { addCartItem, createQuote, parseLine, setCoupon, storedCart } from '../../src/mocks/domain/cart.ts'
import { createOrder, settleOrder } from '../../src/mocks/domain/orders.ts'
import { requireUser } from '../../src/mocks/domain/session.ts'
import { MockError } from '../../src/mocks/errors.ts'
import { now, replaceDatabase, snapshot, transaction } from '../../src/mocks/state/store.ts'
import type { CreateOrderRequest } from '../../src/types/marketplace.ts'

const identity = { token: 'unit-alice-session', guestId: 'unit-guest' }
const line = { nftId: 'nft-001', editionId: 'nft-001-ed-10', quantity: 2 }
const problem = (code: string) => (error: unknown) => error instanceof MockError && error.problem.code === code

beforeEach(async () => {
  const db = createFixtures()
  db.scenario.name = 'payment-pending'
  db.sessions.push({ token: identity.token, userId: 'user-alice', expiresAt: Date.now() + 1_800_000, connection: { walletId: 'wallet-alice-primary', network: 'ethereum', connected: true } })
  db.carts['user:user-alice'] = { id: 'unit-cart', version: 1, items: [], couponCode: null }
  await replaceDatabase(db)
})

test('migração de artwork preserva estoque, preço, usuário e pedidos persistidos', async () => {
  const db = snapshot()
  db.nfts[0]!.image.src = '/assets/figma/8f387.png'
  db.nfts[0]!.editions[0]!.priceEth = '2.123456789123456789'
  db.nfts[0]!.version = 7
  db.nfts[1]!.image.src = '/custom-artwork.webp'
  await replaceDatabase(db)
  const migrated = snapshot()
  assert.equal(migrated.nfts[0]!.image.src, '/assets/artwork/8f387-1254.webp')
  assert.equal(migrated.nfts[1]!.image.src, '/custom-artwork.webp')
  migrated.nfts[0]!.image.src = db.nfts[0]!.image.src
  assert.deepEqual(migrated, db)
})

async function checkout(coupon = false): Promise<CreateOrderRequest> {
  const quote = await transaction((db) => {
    addCartItem(db, identity, line)
    if (coupon) setCoupon(db, identity, 'WELCOME10')
    return createQuote(db, identity, { walletId: 'wallet-alice-primary', network: 'ethereum' })
  })
  return { quoteId: quote.id, walletId: 'wallet-alice-primary', network: 'ethereum', collector: { displayName: 'Alice', username: 'alice', email: 'alice@example.test', profileName: 'alice' } }
}

test('ETH usa precisão de 18 casas e quantidades rejeitam frações', () => {
  assert.equal(sumEth(['0.1', '0.2']), '0.3')
  assert.equal(formatEth(parseEth('1.000000000000000001') * 3n), '3.000000000000000003')
  assert.throws(() => parseEth('1e-3'))
  assert.throws(() => parseEth('0.0000000000000000001'))
  assert.throws(() => parseLine({ ...line, quantity: 1.5 }), problem('VALIDATION_ERROR'))
  assert.throws(() => parseLine({ ...line, quantity: '2' }), problem('VALIDATION_ERROR'))
})

test('catálogo combina filtros, ordena e pagina sem expor contadores internos', () => {
  const db = snapshot()
  const filters = { category: ['art'] as const, network: ['ethereum'] as const, minPrice: '1.0', maxPrice: '6.0', sort: 'price-asc' as const, pageSize: 1 }
  const first = listNfts(db, { ...filters, category: [...filters.category], network: [...filters.network], page: 1 })
  const second = listNfts(db, { ...filters, category: [...filters.category], network: [...filters.network], page: 2 })
  assert.equal(first.pagination.totalItems, 2)
  assert.equal(first.items[0]!.id, 'nft-001')
  assert.equal(second.items[0]!.id, 'nft-022')
  assert.equal(nftDetail(db, 'nft-008').availableQuantity, 0)
  assert.equal('reserved' in first.items[0]!.editions[0]!, false)
  assert.throws(() => nftDetail(db, 'missing'), problem('NFT_NOT_FOUND'))
})

test('cotação exata, idempotência concorrente, snapshot e baixa apenas das quantidades compradas', async () => {
  const input = await checkout(true)
  const quote = snapshot().quotes[input.quoteId]!.quote
  assert.equal(quote.subtotalEth, '2.38')
  assert.equal(quote.discountEth, '0.238')
  assert.equal(quote.totalEth, '2.158')
  const [first, repeat] = await Promise.all([
    transaction((db, events) => createOrder(db, events, identity, input, 'same-key')),
    transaction((db, events) => createOrder(db, events, identity, input, 'same-key')),
  ])
  assert.equal(first.order.id, repeat.order.id)
  assert.equal(repeat.replayed, true)
  assert.equal(nftDetail(snapshot(), line.nftId).editions[1]!.availableQuantity, 6)
  await assert.rejects(transaction((db, events) => createOrder(db, events, identity, { ...input, collector: { ...input.collector, notes: 'different' } }, 'same-key')), problem('IDEMPOTENCY_CONFLICT'))
  await transaction((db, events) => {
    addCartItem(db, identity, { ...line, quantity: 1 })
    settleOrder(db, events, first.order.id, 'confirmed')
    updateNft(db, events, line.nftId, line.editionId, { priceEth: '2.0' })
  })
  const result = snapshot()
  assert.equal(result.carts['user:user-alice']!.items[0]!.quantity, 1)
  assert.equal(result.orders[first.order.id]!.order.receipt!.totalEth, '2.158')
  assert.equal(result.orders[first.order.id]!.order.receipt!.items[0]!.unitPriceEth, '1.19')
  await transaction((db, events) => settleOrder(db, events, first.order.id, 'confirmed'))
  assert.equal(nftDetail(snapshot(), line.nftId).editions[1]!.availableQuantity, 6)
  await assert.rejects(transaction((db, events) => settleOrder(db, events, first.order.id, 'declined')), problem('ORDER_TERMINAL'))
})

test('revalidação impede cotação antiga, recusa libera reserva e cupom/estoque são rechecados', async () => {
  const input = await checkout()
  await transaction((db, events) => updateNft(db, events, line.nftId, line.editionId, { priceEth: '1.49' }))
  await assert.rejects(transaction((db, events) => createOrder(db, events, identity, input, 'stale')), problem('QUOTE_CHANGED'))
  const fresh = await transaction((db) => createQuote(db, identity, { walletId: input.walletId, network: input.network }))
  const pending = await transaction((db, events) => createOrder(db, events, identity, { ...input, quoteId: fresh.id }, 'decline'))
  await transaction((db, events) => settleOrder(db, events, pending.order.id, 'declined'))
  assert.equal(nftDetail(snapshot(), line.nftId).editions[1]!.availableQuantity, 8)
  assert.equal(snapshot().carts['user:user-alice']!.items[0]!.quantity, 2)
  await assert.rejects(transaction((db) => setCoupon(db, identity, 'EXPIRED')), problem('COUPON_EXPIRED'))
  await assert.rejects(transaction((db) => setCoupon(db, identity, 'NOPE')), problem('COUPON_INVALID'))
  await transaction((db, events) => updateNft(db, events, line.nftId, line.editionId, { availableQuantity: 0 }))
  await assert.rejects(transaction((db) => createQuote(db, identity, {})), problem('INSUFFICIENT_STOCK'))
  assert.equal(storedCart(snapshot(), 'user:user-alice').items[0]!.quantity, 2)
})

test('credenciais derivadas, isolamento e expiração não dependem de senhas em claro', async () => {
  await transaction((db) => {
    addCartItem(db, identity, { ...line, quantity: 3 })
    addCartItem(db, { token: null, guestId: identity.guestId }, { ...line, quantity: 7 })
  })
  const alice = await login({ email: 'alice@example.test', password: 'Demo#2026' }, { token: null, guestId: identity.guestId })
  assert.deepEqual(alice.cartMerge?.adjustments, [{ nftId: line.nftId, editionId: line.editionId, requestedQuantity: 10, acceptedQuantity: 8 }])
  const bruno = await login({ email: 'bruno@example.test', password: 'Demo#2026' }, { token: null, guestId: null })
  assert.notEqual(alice.token, bruno.token)
  assert.equal(requireUser(snapshot(), bruno.token).profile.id, 'user-bruno')
  await changePassword(alice.token, { currentPassword: 'Demo#2026', newPassword: 'Changed#2026', confirmPassword: 'Changed#2026' })
  await assert.rejects(login({ email: 'alice@example.test', password: 'Demo#2026' }, { token: null, guestId: null }), problem('INVALID_CREDENTIALS'))
  await login({ email: 'alice@example.test', password: 'Changed#2026' }, { token: null, guestId: null })
  assert.equal(JSON.stringify(snapshot()).includes('Changed#2026'), false)
  assert.equal(JSON.stringify(snapshot()).includes('Demo#2026'), false)
  await transaction((db) => { db.sessions.find((session) => session.token === bruno.token)!.expiresAt = now(db) - 1 })
  assert.throws(() => requireUser(snapshot(), bruno.token), problem('SESSION_EXPIRED'))
})
