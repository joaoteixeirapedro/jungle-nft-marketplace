import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import type { ApiProblem, Cart, CreateOrderRequest, NftDetail, NftUpdatedEvent, Order, OrderUpdatedEvent, PageResult, Profile, Quote, Receipt, SessionResponse, Wallet } from '../../src/types/marketplace.ts'

interface Result<T> { status: number; data: T | null; replayed: string | null }
async function api<T = ApiProblem>(page: Page, path: string, method = 'GET', body?: unknown, token?: string, headers: Record<string, string> = {}, timeoutMs = 0): Promise<Result<T>> {
  return page.evaluate(async (input) => {
    try {
      const response = await fetch(`/api${input.path}`, {
        method: input.method,
        headers: { 'Content-Type': 'application/json', 'X-Guest-Id': 'browser-test-guest', ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}), ...input.headers },
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: input.timeoutMs ? AbortSignal.timeout(input.timeoutMs) : undefined,
      })
      const content = await response.text()
      return { status: response.status, data: content ? JSON.parse(content) : null, replayed: response.headers.get('Idempotency-Replayed') }
    } catch (error) {
      return { status: 0, data: { code: error instanceof Error ? error.name : 'NETWORK_ERROR' }, replayed: null }
    }
  }, { path, method, body, token, headers, timeoutMs }) as Promise<Result<T>>
}
async function signIn(page: Page, name = 'alice') {
  const response = await api<SessionResponse>(page, '/session', 'POST', { email: `${name}@example.test`, password: 'Demo#2026' })
  expect(response.status).toBe(200)
  return response.data!.token
}
async function scenario(page: Page, name: string) { expect((await api(page, '/__mock/scenario', 'PUT', { scenario: name })).status).toBe(200) }
async function purchase(page: Page, token: string): Promise<CreateOrderRequest> {
  expect((await api(page, '/cart', 'DELETE', undefined, token)).status).toBe(200)
  expect((await api(page, '/cart/items', 'POST', { nftId: 'nft-001', editionId: 'nft-001-ed-10', quantity: 2 }, token)).status).toBe(201)
  expect((await api(page, '/wallets/wallet-alice-primary/connection', 'POST', { network: 'ethereum' }, token)).status).toBe(200)
  const quote = await api<Quote>(page, '/quotes', 'POST', { network: 'ethereum', walletId: 'wallet-alice-primary' }, token)
  expect(quote.status).toBe(201)
  return { quoteId: quote.data!.id, network: 'ethereum', walletId: 'wallet-alice-primary', collector: { displayName: 'Alice', username: 'alice', email: 'alice@example.test', profileName: 'alice' } }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /SEJA DONO/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Todos os NFTs' }).getByTestId('nft-card')).toHaveCount(9)
  expect((await api(page, '/__mock/reset', 'POST')).status).toBe(200)
})

test('API: catálogo combina filtros, pagina, detalha e valida estoque', async ({ page }) => {
  const first = await api<PageResult<NftDetail>>(page, '/nfts?category=art&network=ethereum&minPrice=1&maxPrice=6&sort=price-asc&pageSize=1')
  expect(first.data!.pagination).toMatchObject({ totalItems: 2, totalPages: 2 })
  expect(first.data!.items[0]!.id).toBe('nft-001')
  const second = await api<PageResult<NftDetail>>(page, '/nfts?category=art&network=ethereum&minPrice=1&maxPrice=6&sort=price-asc&pageSize=1&page=2')
  expect(second.data!.items[0]!.id).toBe('nft-022')
  const search = await api<PageResult<NftDetail>>(page, '/nfts?q=Emerald')
  expect(search.data!.pagination.totalItems).toBe(1)
  const detail = await api<NftDetail>(page, '/nfts/nft-001')
  expect(detail.data!.creator.id).toBe('creator-lia')
  expect(detail.data!.editions[1]!.availableQuantity).toBe(8)
  expect((await api<NftDetail>(page, '/nfts/nft-008')).data!.availableQuantity).toBe(0)
  expect((await api(page, '/nfts/missing')).status).toBe(404)
  expect((await api(page, '/nfts?page=1.5')).status).toBe(422)
  expect((await api(page, '/cart/items', 'POST', { nftId: 'nft-001', editionId: 'nft-001-ed-10', quantity: 9 })).data!.code).toBe('INSUFFICIENT_STOCK')
  expect((await api(page, '/cart/items', 'POST', { nftId: 'nft-001', editionId: 'nft-001-ed-10', quantity: 0.5 })).status).toBe(422)
})

test('API: visitante, contas isoladas, perfil, senha e carteiras persistem após refresh', async ({ page }) => {
  await api(page, '/cart/items', 'POST', { nftId: 'nft-001', editionId: 'nft-001-ed-10', quantity: 1 })
  const alice = await signIn(page)
  const aliceCart = await api<Cart>(page, '/cart', 'GET', undefined, alice)
  expect(aliceCart.data!.items.map((item) => item.nftId)).toEqual(['nft-002', 'nft-001'])
  const bruno = await signIn(page, 'bruno')
  expect((await api<Cart>(page, '/cart', 'GET', undefined, bruno)).data!.items.map((item) => item.nftId)).toEqual(['nft-003'])
  await api(page, '/favorites/nft-005', 'PUT', {}, alice)
  expect((await api<{ items: NftDetail[] }>(page, '/favorites', 'GET', undefined, bruno)).data!.items.map((nft) => nft.id)).toEqual(['nft-002'])
  expect((await api(page, '/wallets/wallet-alice-primary', 'PATCH', { alias: 'não permitido' }, bruno)).status).toBe(404)
  expect((await api(page, '/profile')).status).toBe(401)
  expect((await api(page, '/session', 'GET', undefined, 'expired-demo-session')).data!.code).toBe('SESSION_EXPIRED')
  const registered = await api<SessionResponse>(page, '/accounts', 'POST', { username: 'charlie', email: 'charlie@example.test', password: 'Charlie#2026', confirmPassword: 'Charlie#2026' })
  expect(registered.status).toBe(201)
  const token = registered.data!.token
  expect((await api(page, '/accounts', 'POST', { username: 'other', email: 'charlie@example.test', password: 'Charlie#2026', confirmPassword: 'Charlie#2026' })).status).toBe(409)
  expect((await api(page, '/profile', 'PATCH', { displayName: 'Charlie Colecionador' }, token)).status).toBe(200)
  const avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aBAAAAAAASUVORK5CYII='
  expect((await api(page, '/profile/avatar', 'PATCH', { dataUrl: avatar }, token)).status).toBe(200)
  const wallet = { role: 'primary', displayName: 'Principal', alias: 'Charlie', profileName: 'charlie', email: 'charlie@example.test', ens: null, referralCode: 'DEMO', secondaryAddress: null, network: 'ethereum', type: 'metamask', address: `0x${'4'.repeat(40)}` }
  const saved = await api<Wallet>(page, '/wallets', 'POST', wallet, token)
  expect(saved.status).toBe(201)
  expect((await api(page, `/wallets/${saved.data!.id}/connection`, 'POST', { network: 'polygon' }, token)).status).toBe(422)
  expect((await api(page, `/wallets/${saved.data!.id}/connection`, 'POST', { network: 'ethereum' }, token)).status).toBe(200)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: /SEJA DONO/ })).toBeVisible()
  expect((await api<Profile>(page, '/profile', 'GET', undefined, token)).data).toMatchObject({ displayName: 'Charlie Colecionador', avatarUrl: avatar })
  expect((await api<{ items: Wallet[] }>(page, '/wallets', 'GET', undefined, token)).data!.items).toHaveLength(1)
  expect((await api<SessionResponse>(page, '/session', 'GET', undefined, token)).data!.connection).toMatchObject({ walletId: saved.data!.id, network: 'ethereum', connected: true })
  expect((await api<Cart>(page, '/cart', 'GET', undefined, alice)).data!.items).toHaveLength(2)
  expect((await api(page, '/profile/password', 'POST', { currentPassword: 'Charlie#2026', newPassword: 'Changed#2026', confirmPassword: 'Changed#2026' }, token)).status).toBe(200)
  expect((await api(page, '/session', 'POST', { email: 'charlie@example.test', password: 'Charlie#2026' })).status).toBe(401)
  expect((await api(page, '/session', 'POST', { email: 'charlie@example.test', password: 'Changed#2026' })).status).toBe(200)
  expect(await page.evaluate(() => localStorage.getItem('jungle-marketplace.mock.v1')!.includes('Changed#2026'))).toBe(false)
  await scenario(page, 'unauthorized')
  expect((await api(page, '/favorites', 'GET', undefined, alice)).status).toBe(401)
  await scenario(page, 'session-expired')
  expect((await api(page, '/session', 'GET', undefined, alice)).data!.code).toBe('SESSION_EXPIRED')
})

test('API: pedidos idempotentes, recibo congelado e estoque/carrinho consistentes', async ({ page }) => {
  const alice = await signIn(page)
  const input = await purchase(page, alice)
  await scenario(page, 'payment-pending')
  const [one, two] = await Promise.all([
    api<Order>(page, '/orders', 'POST', input, alice, { 'Idempotency-Key': 'browser-concurrent' }),
    api<Order>(page, '/orders', 'POST', input, alice, { 'Idempotency-Key': 'browser-concurrent' }),
  ])
  expect([one.status, two.status].sort()).toEqual([200, 201])
  expect(one.data!.id).toBe(two.data!.id)
  const id = one.data!.id
  expect((await api(page, `/orders/${id}/receipt`, 'GET', undefined, alice)).status).toBe(409)
  expect((await api(page, '/orders', 'POST', { ...input, collector: { ...input.collector, notes: 'different' } }, alice, { 'Idempotency-Key': 'browser-concurrent' })).data!.code).toBe('IDEMPOTENCY_CONFLICT')
  await api(page, '/cart/items', 'POST', { nftId: 'nft-001', editionId: 'nft-001-ed-10', quantity: 1 }, alice)
  await api(page, `/__mock/orders/${id}/settle`, 'POST', { status: 'confirmed' })
  const before = await api<Receipt>(page, `/orders/${id}/receipt`, 'GET', undefined, alice)
  expect(before.data!.totalEth).toBe('2.396')
  expect((await api<Cart>(page, '/cart', 'GET', undefined, alice)).data!.items[0]!.quantity).toBe(1)
  await api(page, '/__mock/nfts/nft-001', 'PATCH', { editionId: 'nft-001-ed-10', priceEth: '9.0' })
  expect((await api<Receipt>(page, `/orders/${id}/receipt`, 'GET', undefined, alice)).data).toEqual(before.data)
  expect((await api<NftDetail>(page, '/nfts/nft-001')).data!.editions[1]!.availableQuantity).toBe(6)
  const bruno = await signIn(page, 'bruno')
  expect((await api(page, `/orders/${id}`, 'GET', undefined, bruno)).status).toBe(403)
  expect((await api(page, `/__mock/orders/${id}/settle`, 'POST', { status: 'declined' })).data!.code).toBe('ORDER_TERMINAL')
})

test('API: cenários determinísticos de erro, latência, fora de ordem, preço e cupons', async ({ page }) => {
  await scenario(page, 'empty')
  expect((await api<PageResult<NftDetail>>(page, '/nfts')).data!.pagination.totalItems).toBe(0)
  await scenario(page, 'server-error')
  expect((await api(page, '/nfts')).status).toBe(503)
  await scenario(page, 'transient-error')
  expect((await api(page, '/nfts')).status).toBe(503)
  expect((await api(page, '/nfts')).status).toBe(200)
  await scenario(page, 'network-error')
  expect((await api(page, '/nfts')).status).toBe(0)
  await scenario(page, 'validation-error')
  expect((await api(page, '/cart/items', 'POST', {})).status).toBe(422)
  await scenario(page, 'out-of-order')
  const completed: string[] = []
  await Promise.all([
    api(page, '/nfts?q=Emerald').then(() => completed.push('first')),
    api(page, '/nfts?q=Sage').then(() => completed.push('second')),
  ])
  expect(completed).toEqual(['second', 'first'])
  await scenario(page, 'default')
  const alice = await signIn(page)
  const input = await purchase(page, alice)
  expect((await api(page, '/cart/coupon', 'PUT', { code: 'INVALID' }, alice)).data!.code).toBe('COUPON_INVALID')
  expect((await api(page, '/cart/coupon', 'PUT', { code: 'EXPIRED' }, alice)).data!.code).toBe('COUPON_EXPIRED')
  await scenario(page, 'price-changed')
  expect((await api(page, '/orders', 'POST', input, alice, { 'Idempotency-Key': 'stale-price' })).data!.code).toBe('QUOTE_CHANGED')
  const currentCart = await api<Cart>(page, '/cart', 'GET', undefined, alice)
  expect(currentCart.data!.items[0]!.unitPriceEth).toBe('1.49')
  await scenario(page, 'stock-conflict')
  expect((await api(page, '/quotes', 'POST', {}, alice)).data!.code).toBe('INSUFFICIENT_STOCK')
})

test('API: timeout após criação recupera mesmo pedido; pagamento recusado libera estoque', async ({ page }) => {
  const alice = await signIn(page)
  const input = await purchase(page, alice)
  await scenario(page, 'order-timeout')
  expect((await api(page, '/orders', 'POST', input, alice, { 'Idempotency-Key': 'timeout-created' }, 250)).status).toBe(0)
  const recovered = await api<Order>(page, '/orders', 'POST', input, alice, { 'Idempotency-Key': 'timeout-created' })
  expect(recovered.status).toBe(200)
  expect(recovered.replayed).toBe('true')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: /SEJA DONO/ })).toBeVisible()
  expect((await api<Order>(page, '/orders', 'POST', input, alice, { 'Idempotency-Key': 'timeout-created' })).data!.id).toBe(recovered.data!.id)
  expect((await api<{ items: Order[] }>(page, '/orders', 'GET', undefined, alice)).data!.items).toHaveLength(2)
  await api(page, '/__mock/clock', 'POST', { advanceMs: 2000 })
  expect((await api<Order>(page, `/orders/${recovered.data!.id}`, 'GET', undefined, alice)).data!.status).toBe('confirmed')
  await api(page, '/__mock/reset', 'POST')
  const nextToken = await signIn(page)
  const next = await purchase(page, nextToken)
  await scenario(page, 'payment-declined')
  const declined = await api<Order>(page, '/orders', 'POST', next, nextToken, { 'Idempotency-Key': 'declined' })
  await api(page, '/__mock/clock', 'POST', { advanceMs: 2000 })
  expect((await api<Order>(page, `/orders/${declined.data!.id}`, 'GET', undefined, nextToken)).data!.status).toBe('declined')
  expect((await api<Cart>(page, '/cart', 'GET', undefined, nextToken)).data!.items[0]!.quantity).toBe(2)
  expect((await api<NftDetail>(page, '/nfts/nft-001')).data!.editions[1]!.availableQuantity).toBe(8)
})

type ProbeEvent = { name: string; payload: NftUpdatedEvent | OrderUpdatedEvent }
interface ProbeSocket { on: (name: string, listener: (payload: unknown) => void) => void; emit: (name: string, payload: unknown) => void }
interface ProbeWindow { io: (url: string, options: object) => ProbeSocket; probes: Record<string, { events: ProbeEvent[] }> }
async function connectProbe(page: Page, label: string, token: string) {
  await page.evaluate(({ label, token }) => new Promise<void>((resolve, reject) => {
    const browser = window as unknown as ProbeWindow
    browser.probes ??= {}
    const events: ProbeEvent[] = []
    browser.probes[label] = { events }
    const client = browser.io('https://realtime.nft-marketplace.test', { transports: ['websocket'], upgrade: false })
    const timeout = setTimeout(() => reject(new Error('Socket probe não conectou.')), 5000)
    client.on('connect', () => client.emit('client:ready', { sessionToken: token }))
    client.on('server:ready', () => { clearTimeout(timeout); resolve() })
    client.on('connect_error', (error) => { clearTimeout(timeout); reject(new Error(String(error))) })
    for (const name of ['nft.updated', 'order.updated']) client.on(name, (payload) => events.push({ name, payload: payload as ProbeEvent['payload'] }))
  }), { label, token })
}
async function probeEvents(page: Page, label: string, name: string) {
  return page.evaluate(({ label, name }) => (window as unknown as ProbeWindow).probes[label]!.events.filter((event) => event.name === name), { label, name })
}

test('API: alterações canônicas passam pelo Socket.IO e eventos privados respeitam sessão', async ({ page }) => {
  const alice = await signIn(page)
  const bruno = await signIn(page, 'bruno')
  await page.addScriptTag({ path: fileURLToPath(new URL('../../node_modules/socket.io-client/dist/socket.io.min.js', import.meta.url)) })
  await connectProbe(page, 'alice', alice)
  await connectProbe(page, 'bruno', bruno)
  await api(page, '/__mock/nfts/nft-001', 'PATCH', { editionId: 'nft-001-ed-10', priceEth: '1.29' })
  await expect.poll(async () => (await probeEvents(page, 'alice', 'nft.updated')).length).toBe(1)
  const event = (await probeEvents(page, 'alice', 'nft.updated'))[0]!.payload as NftUpdatedEvent
  expect(event.data.editions[1]!.priceEth).toBe('1.29')
  expect(event.id).toBeTruthy()
  expect(event.version).toBe((await api<NftDetail>(page, '/nfts/nft-001')).data!.version)
  const input = await purchase(page, alice)
  await scenario(page, 'payment-pending')
  const pending = await api<Order>(page, '/orders', 'POST', input, alice, { 'Idempotency-Key': 'event-order' })
  await expect.poll(async () => (await probeEvents(page, 'alice', 'order.updated')).length).toBe(1)
  expect((await probeEvents(page, 'alice', 'order.updated'))[0]!.payload.resourceId).toBe(pending.data!.id)
  expect(await probeEvents(page, 'bruno', 'order.updated')).toEqual([])
  await api(page, '/session', 'DELETE', undefined, alice)
  await api(page, `/__mock/orders/${pending.data!.id}/settle`, 'POST', { status: 'confirmed' })
  await expect.poll(async () => (await probeEvents(page, 'alice', 'nft.updated')).length).toBe(3)
  expect(await probeEvents(page, 'bruno', 'order.updated')).toEqual([])
  expect(await probeEvents(page, 'alice', 'order.updated')).toHaveLength(1)
})
