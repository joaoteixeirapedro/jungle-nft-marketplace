import { formatEth, parseEth } from '../../lib/eth.ts'
import { MAX_QUANTITY } from '../../lib/quantity.ts'
import type { Cart, CartLineInput, CartMergeResult, Network, Quote, QuoteRequest, Totals } from '../../types/marketplace.ts'
import { integer, MockError, record, text } from '../errors.ts'
import type { MockDatabase, StoredCart } from '../state/model.ts'
import { nextId, now } from '../state/store.ts'
import { available, findEdition, findNft } from './catalog.ts'
import { cartOwner, type Identity, requireUser } from './session.ts'

export const lineId = (line: CartLineInput) => `${line.nftId}:${line.editionId}`
export function storedCart(db: MockDatabase, owner: string): StoredCart {
  return db.carts[owner] ?? (db.carts[owner] = { id: nextId(db, 'cart'), version: 1, items: [], couponCode: null })
}
export function parseLine(body: unknown): CartLineInput {
  const input = record(body)
  return { nftId: text(input.nftId, 'nftId'), editionId: text(input.editionId, 'editionId'), quantity: integer(input.quantity, 'quantity') }
}
export function assertStock(db: MockDatabase, line: CartLineInput) {
  const nft = findNft(db, line.nftId)
  const edition = findEdition(nft, line.editionId)
  if (line.quantity > available(edition)) throw new MockError(409, 'INSUFFICIENT_STOCK', 'Quantidade indisponível para esta edição.', undefined, { nftId: nft.id, editionId: edition.id, availableQuantity: available(edition) })
}
function couponDiscount(db: MockDatabase, code: string | null, subtotal: bigint) {
  if (!code) return 0n
  const coupon = db.coupons.find((item) => item.code === code)
  if (db.scenario.name === 'coupon-invalid' || !coupon) throw new MockError(422, 'COUPON_INVALID', 'Cupom inválido.', { couponCode: 'Código não reconhecido.' })
  if (db.scenario.name === 'coupon-expired' || Date.parse(coupon.expiresAt) <= now(db)) throw new MockError(422, 'COUPON_EXPIRED', 'Este cupom expirou.', { couponCode: 'Cupom expirado.' })
  // Round down to the smallest ETH unit (wei), once per quote.
  return subtotal * BigInt(coupon.discountBps) / 10_000n
}
export function cartView(db: MockDatabase, cart: StoredCart, network: Network = 'ethereum', strict = false): Cart {
  const issues: Cart['issues'] = []
  const items = cart.items.map((line) => {
    const nft = findNft(db, line.nftId)
    const edition = findEdition(nft, line.editionId)
    if (line.quantity > available(edition)) issues.push({ code: 'INSUFFICIENT_STOCK', message: 'A disponibilidade mudou.', details: { nftId: nft.id, editionId: edition.id, availableQuantity: available(edition) } })
    return { ...line, id: lineId(line), nftName: nft.name, editionLabel: edition.label, unitPriceEth: edition.priceEth, lineTotalEth: formatEth(parseEth(edition.priceEth) * BigInt(line.quantity)), availableQuantity: available(edition), nftVersion: nft.version }
  })
  const subtotal = items.reduce((sum, item) => sum + parseEth(item.lineTotalEth), 0n)
  let discount = 0n
  let couponStatus: Cart['couponStatus'] = cart.couponCode ? 'valid' : 'none'
  try { discount = couponDiscount(db, cart.couponCode, subtotal) } catch (error) {
    if (!(error instanceof MockError)) throw error
    couponStatus = error.problem.code === 'COUPON_EXPIRED' ? 'expired' : 'invalid'
    issues.push(error.problem)
    if (strict) throw error
  }
  if (strict && issues.length) throw new MockError(409, 'INSUFFICIENT_STOCK', 'Revise os itens indisponíveis antes de continuar.', undefined, { issues })
  const fee = items.length ? parseEth(db.networkFees[network]) : 0n
  const totals: Totals = { subtotalEth: formatEth(subtotal), discountEth: formatEth(discount), networkFeeEth: formatEth(fee), totalEth: formatEth(subtotal - discount + fee) }
  return { id: cart.id, version: cart.version, items, couponCode: cart.couponCode, couponStatus, totals, issues }
}
export function addCartItem(db: MockDatabase, identity: Identity, input: CartLineInput) {
  const cart = storedCart(db, cartOwner(db, identity))
  const existing = cart.items.find((item) => lineId(item) === lineId(input))
  const quantity = integer((existing?.quantity ?? 0) + input.quantity, 'quantity')
  assertStock(db, { ...input, quantity })
  if (existing) existing.quantity = quantity
  else cart.items.push(input)
  cart.version++
  return cartView(db, cart)
}
export function changeCartItem(db: MockDatabase, identity: Identity, id: string, quantity: number | null) {
  const cart = storedCart(db, cartOwner(db, identity))
  const index = cart.items.findIndex((item) => lineId(item) === id)
  if (index === -1) throw new MockError(404, 'CART_ITEM_NOT_FOUND', 'Item não encontrado no seu carrinho.')
  if (quantity === null) cart.items.splice(index, 1)
  else { assertStock(db, { ...cart.items[index]!, quantity }); cart.items[index]!.quantity = quantity }
  cart.version++
  return cartView(db, cart)
}
export function setCoupon(db: MockDatabase, identity: Identity, value: string | null) {
  const cart = storedCart(db, cartOwner(db, identity))
  const code = value?.trim().toUpperCase() ?? null
  couponDiscount(db, code, 0n)
  cart.couponCode = code
  cart.version++
  return cartView(db, cart)
}
export function mergeGuestCart(db: MockDatabase, guestId: string | null, userId: string): CartMergeResult {
  const result: CartMergeResult = { merged: false, adjustments: [] }
  if (!guestId || !/^[\w-]{1,80}$/.test(guestId)) return result
  const guest = db.carts[`guest:${guestId}`]
  if (!guest) return result
  result.merged = true
  const target = storedCart(db, `user:${userId}`)
  for (const incoming of guest.items) {
    const existing = target.items.find((item) => lineId(item) === lineId(incoming))
    const edition = findEdition(findNft(db, incoming.nftId), incoming.editionId)
    const requestedQuantity = (existing?.quantity ?? 0) + incoming.quantity
    const quantity = Math.min(MAX_QUANTITY, available(edition), requestedQuantity)
    if (quantity !== requestedQuantity) result.adjustments.push({ nftId: incoming.nftId, editionId: incoming.editionId, requestedQuantity, acceptedQuantity: quantity })
    if (existing) existing.quantity = quantity
    else if (quantity) target.items.push({ ...incoming, quantity })
  }
  target.items = target.items.filter((item) => item.quantity > 0)
  target.couponCode ??= guest.couponCode
  target.version++
  delete db.carts[`guest:${guestId}`]
  return result
}
export function quoteFingerprint(db: MockDatabase, cart: StoredCart, network: Network, walletId: string | null) {
  const view = cartView(db, cart, network, true)
  const walletVersion = walletId ? Object.values(db.wallets).flat().find((wallet) => wallet.id === walletId)?.version : null
  return JSON.stringify({ cartVersion: cart.version, items: view.items, totals: view.totals, couponCode: view.couponCode, network, walletId, walletVersion })
}
export function createQuote(db: MockDatabase, identity: Identity, input: QuoteRequest): Quote {
  const owner = cartOwner(db, identity)
  const cart = storedCart(db, owner)
  const network = input.network ?? 'ethereum'
  const walletId = input.walletId ?? null
  if (walletId) {
    const user = requireUser(db, identity.token)
    const wallet = db.wallets[user.profile.id]?.find((item) => item.id === walletId)
    if (!wallet) throw new MockError(404, 'WALLET_NOT_FOUND', 'Carteira não encontrada para este usuário.')
    if (wallet.network !== network) throw new MockError(422, 'NETWORK_MISMATCH', 'Selecione a rede cadastrada para a carteira.', { network: 'Rede incompatível com a carteira.' })
  }
  if (!cart.items.length) throw new MockError(422, 'EMPTY_CART', 'Seu carrinho está vazio.')
  const view = cartView(db, cart, network, true)
  const quote: Quote = { id: nextId(db, 'quote'), cartVersion: cart.version, items: view.items, couponCode: view.couponCode, network, walletId, expiresAt: new Date(now(db) + 5 * 60_000).toISOString(), ...view.totals }
  db.quotes[quote.id] = { owner, quote, fingerprint: quoteFingerprint(db, cart, network, walletId) }
  return quote
}
