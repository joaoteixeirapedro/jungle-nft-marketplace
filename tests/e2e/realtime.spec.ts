import { expect, test, type Page, type Request } from '@playwright/test'
import type { Cart, NftDetail, Order, Quote, Wallet } from '../../src/types/marketplace.ts'
import type { DomainEvent } from '../../src/mocks/state/store.ts'

async function api<T = Record<string, unknown>>(page: Page, path: string, method = 'GET', body?: object) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = sessionStorage.getItem('jungle-marketplace.session')
    const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Guest-Id': sessionStorage.getItem('jungle-marketplace.guest') ?? 'realtime-test', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    return { status: response.status, data: response.status === 204 ? null as T : await response.json() as T }
  }, { path, method, body })
}
interface Transport { held: boolean; connections: number; subscriptions: number; events: DomainEvent[] }
const transport = async (page: Page) => (await api<Transport>(page, '/__mock/realtime')).data
const control = (page: Page, body: object) => api<Transport>(page, '/__mock/realtime', 'POST', body)
const scenario = (page: Page, name: string) => api(page, '/__mock/scenario', 'PUT', { scenario: name })
const update = (page: Page, priceEth: string, id = 'nft-001', availableQuantity?: number) => api(page, `/__mock/nfts/${id}`, 'PATCH', { editionId: `${id}-ed-10`, priceEth, ...(availableQuantity === undefined ? {} : { availableQuantity }) })
const orderPost = (request: Request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders'
const reviewButton = (page: Page) => page.getByRole('button', { name: 'Revisar compra', exact: true })
async function ready(page: Page) {
  await expect.poll(async () => { const status = await transport(page); return [status.connections, status.subscriptions] }).toEqual([1, 1])
  await expect(page.getByTestId('realtime-status')).toHaveCount(0)
  await expect(page.locator('main')).toHaveAttribute('data-realtime-state', 'ready')
}
async function signIn(page: Page, account = 'alice') {
  await page.getByLabel('E-mail', { exact: true }).fill(`${account}@example.test`)
  await page.getByLabel('Senha', { exact: true }).fill('Demo#2026')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}
async function checkout(page: Page) {
  await page.goto('/login?redirect=%2Fcheckout')
  await signIn(page)
  await page.getByRole('button', { name: 'Conectar carteira simulada', exact: true }).click()
  await expect(reviewButton(page)).toBeEnabled()
}
async function confirm(page: Page) {
  await expect(reviewButton(page)).toBeEnabled()
  await reviewButton(page).click()
  await page.getByRole('dialog', { name: 'Revisar compra simulada' }).getByRole('button', { name: 'Confirmar compra simulada' }).click()
}
async function resume(page: Page) {
  await control(page, { action: 'resume' })
  const retry = page.getByRole('button', { name: 'Tentar reconectar', exact: true })
  if (await retry.isVisible()) await retry.click({ timeout: 1_000 }).catch(async (error: unknown) => {
    // Automatic reconnection can remove the optional retry button between lookup and click.
    if (await retry.isVisible()) throw error
    await ready(page)
  })
  await ready(page)
}
test.beforeEach(async ({ page }) => {
  await page.goto('/marketplace')
  await expect(page.locator('.discovery-catalog').getByTestId('nft-card')).toHaveCount(9)
  await api(page, '/__mock/reset', 'POST', {})
})

test('NFT: duplicatas e evento antigo não repetem efeitos; REST atrasada não desfaz evento novo', async ({ page, context }) => {
  await page.goto('/nfts/nft-001')
  await page.getByRole('radio', { name: /^Edição 1\/10,/ }).check()
  await ready(page)
  const peer = await context.newPage()
  await peer.goto('/nfts/nft-001')
  await peer.getByRole('radio', { name: /^Edição 1\/10,/ }).check()
  await ready(peer)
  await update(page, '1.31')
  await expect(page.getByTestId('edition-price')).toHaveText('1.31 ETH')
  await expect(peer.getByTestId('edition-price')).toHaveText('1.31 ETH')
  await peer.close()
  await ready(page)
  const old = (await transport(page)).events.filter((event) => event.type === 'nft.updated').at(-1)!
  await update(page, '1.37')
  await expect(page.getByTestId('edition-price')).toHaveText('1.37 ETH')
  await ready(page)
  const latest = (await transport(page)).events.filter((event) => event.type === 'nft.updated').at(-1)!
  let reads = 0
  page.on('request', (request) => { if (request.method() === 'GET' && /\/api\/(nfts|cart)/.test(request.url())) reads++ })
  await control(page, { action: 'replay', eventId: latest.payload.id, copies: 5 })
  await control(page, { action: 'replay', eventId: old.payload.id, copies: 2 })
  await page.waitForTimeout(150)
  expect(reads).toBe(0)
  await expect(page.getByTestId('edition-price')).toHaveText('1.37 ETH')
  await scenario(page, 'slow')
  const loading = page.waitForRequest((request) => request.method() === 'GET' && new URL(request.url()).pathname === '/api/nfts/nft-001')
  await page.reload()
  await loading
  await expect.poll(async () => (await transport(page)).subscriptions).toBe(1)
  await update(page, '1.45')
  await page.getByRole('radio', { name: /^Edição 1\/10,/ }).check()
  await expect(page.getByTestId('edition-price')).toHaveText('1.45 ETH')
  await ready(page)
  expect((await api<NftDetail>(page, '/nfts/nft-001')).data.editions.find((edition) => edition.label === '1/10')?.priceEth).toBe('1.45')
})

test('reconexão automática e manual reconciliam recursos ativos, falha REST preserva dados e permite recuperar', async ({ page }) => {
  test.setTimeout(45000)
  await page.goto('/nfts/nft-001')
  await page.getByRole('radio', { name: /^Edição 1\/10,/ }).check()
  await ready(page)
  await control(page, { action: 'disconnect', hold: false })
  await update(page, '1.55', 'nft-001', 0)
  await expect(page.getByTestId('realtime-status')).toContainText('temporariamente indisponível')
  await ready(page)
  await expect(page.getByRole('radio', { name: /^Edição 1\/10,/ })).toBeDisabled()
  expect((await api<NftDetail>(page, '/nfts/nft-001')).data.editions.find((edition) => edition.label === '1/10')?.priceEth).toBe('1.55')
  await control(page, { action: 'disconnect' })
  await update(page, '1.65', 'nft-001', 4)
  await scenario(page, 'server-error')
  await control(page, { action: 'resume' })
  await page.getByRole('button', { name: 'Tentar reconectar' }).click()
  await expect(page.getByTestId('realtime-status')).toContainText('Não foi possível atualizar', { timeout: 12000 })
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  await scenario(page, 'default')
  await page.getByRole('button', { name: 'Tentar reconectar' }).click()
  await ready(page)
  await page.getByRole('radio', { name: /^Edição 1\/10,/ }).check()
  await expect(page.getByTestId('edition-price')).toHaveText('1.65 ETH')
})

test('checkout desconectado bloqueia confirmação e reconcilia preço, quote e estoque antes de liberar revisão', async ({ page }) => {
  await checkout(page)
  let posts = 0
  page.on('request', (request) => { if (orderPost(request)) posts++ })
  await reviewButton(page).click()
  const dialog = page.getByRole('dialog', { name: 'Revisar compra simulada' })
  await control(page, { action: 'disconnect' })
  await update(page, '0.100000000000000001', 'nft-002')
  await expect(dialog.getByRole('button', { name: 'Confirmar compra simulada' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Voltar à edição' }).click()
  await resume(page)
  await expect(page.locator('.checkout-summary').getByTestId('purchase-total')).toHaveText('0.116000000000000001 ETH')
  await expect(reviewButton(page)).toBeEnabled()
  await update(page, '0.100000000000000001', 'nft-002', 0)
  await expect(reviewButton(page)).toBeDisabled()
  await expect(page.getByRole('alert').filter({ hasText: 'Revise os itens' })).toBeVisible()
  expect(posts).toBe(0)
})

test('pedido pendente perde evento, reconecta pela REST, mantém terminal ao replay e refresh não cria compra', async ({ page }) => {
  test.setTimeout(45000)
  await checkout(page)
  await scenario(page, 'payment-pending')
  let posts = 0
  page.on('request', (request) => { if (orderPost(request)) posts++ })
  await confirm(page)
  await expect(page.getByRole('heading', { name: 'Pagamento pendente', exact: true })).toBeVisible()
  const id = new URL(page.url()).pathname.split('/').at(-1)!
  const pending = (await transport(page)).events.find((event) => event.type === 'order.updated' && event.payload.resourceId === id)!
  await control(page, { action: 'disconnect' })
  await scenario(page, 'server-error')
  await api(page, `/__mock/orders/${id}/settle`, 'POST', { status: 'confirmed' })
  await expect(page.getByRole('heading', { name: 'Pagamento pendente', exact: true })).toBeVisible()
  await expect(page.getByTestId('order-receipt')).toHaveCount(0)
  await scenario(page, 'default')
  await resume(page)
  await expect(page.getByRole('heading', { name: 'Compra confirmada', exact: true })).toBeVisible()
  const terminal = (await transport(page)).events.filter((event) => event.type === 'order.updated' && event.payload.resourceId === id).at(-1)!
  let replayReads = 0
  page.on('request', (request) => { if (request.method() === 'GET' && new URL(request.url()).pathname === `/api/orders/${id}`) replayReads++ })
  await control(page, { action: 'replay', eventId: terminal.payload.id, copies: 5 })
  await control(page, { action: 'replay', eventId: pending.payload.id, copies: 3 })
  await page.waitForTimeout(150)
  expect(replayReads).toBe(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Compra confirmada', exact: true })).toBeVisible()
  expect(posts).toBe(1)
  await api(page, '/cart/items', 'POST', { nftId: 'nft-002', editionId: 'nft-002-ed-10', quantity: 1 })
  await page.goto('/checkout')
  await expect(reviewButton(page)).toBeEnabled()
  await scenario(page, 'payment-pending')
  await confirm(page)
  await expect(page.getByRole('heading', { name: 'Pagamento pendente', exact: true })).toBeVisible()
  const declinedId = new URL(page.url()).pathname.split('/').at(-1)!
  const old = (await transport(page)).events.find((event) => event.type === 'order.updated' && event.payload.resourceId === declinedId)!
  await control(page, { action: 'disconnect' })
  await api(page, `/__mock/orders/${declinedId}/settle`, 'POST', { status: 'declined' })
  await resume(page)
  await expect(page.getByRole('heading', { name: 'Pagamento recusado', exact: true })).toBeVisible()
  await control(page, { action: 'replay', eventId: old.payload.id, copies: 3 })
  await expect(page.getByRole('heading', { name: 'Pagamento recusado', exact: true })).toBeVisible()
  await expect(page.getByTestId('order-receipt')).toHaveCount(0)
  expect((await api<Cart>(page, '/cart')).data.items[0]?.quantity).toBe(1)
  expect(posts).toBe(2)
})

test('troca de conta remove subscription privada; navegação e reconexões mantêm um único consumidor', async ({ page }) => {
  test.setTimeout(45000)
  await checkout(page)
  await scenario(page, 'payment-pending')
  await confirm(page)
  await expect(page.getByRole('heading', { name: 'Pagamento pendente', exact: true })).toBeVisible()
  const id = new URL(page.url()).pathname.split('/').at(-1)!
  const privateEvent = (await transport(page)).events.find((event) => event.type === 'order.updated' && event.payload.resourceId === id)!
  await page.getByRole('link', { name: 'Meus pedidos', exact: true }).click()
  await page.getByRole('navigation', { name: 'Conta do colecionador' }).getByRole('link', { name: 'Meu perfil, Dados do perfil', exact: true }).click()
  await page.locator('.account-page').getByRole('button', { name: 'Sair da conta', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('link', { name: 'Entrar', exact: true }).filter({ visible: true }).first().click()
  await signIn(page, 'bruno')
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('link', { name: /Minha conta/ }).filter({ visible: true }).first().click()
  await page.getByRole('navigation', { name: 'Conta do colecionador' }).getByRole('link', { name: 'Pedidos', exact: true }).click()
  await expect(page.getByTestId('account-summary')).toContainText('0 pedidos')
  await ready(page)
  let reads = 0
  page.on('request', (request) => { if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/orders') reads++ })
  await api(page, `/__mock/orders/${id}/settle`, 'POST', { status: 'confirmed' })
  expect((await control(page, { action: 'replay', eventId: privateEvent.payload.id })).status).toBe(403)
  await page.waitForTimeout(150)
  expect(reads).toBe(0)
  await expect(page.getByTestId('account-summary')).toContainText('0 pedidos')
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.getByRole('navigation', { name: 'Conta do colecionador' }).getByRole('link', { name: 'Meu perfil, Dados do perfil', exact: true }).click()
    await page.getByRole('navigation', { name: 'Conta do colecionador' }).getByRole('link', { name: 'Pedidos', exact: true }).click()
    await control(page, { action: 'disconnect', hold: false })
    await ready(page)
  }
  await page.getByRole('link', { name: 'Abrir diagnóstico', exact: true }).click()
  await expect(page.getByTestId('socket-status')).toHaveText('Conectado')
  await expect.poll(async () => (await transport(page)).connections).toBe(1)
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Mercado', exact: true }).click()
  await ready(page)
  await page.getByRole('link', { name: /Minha conta/ }).filter({ visible: true }).first().click()
  await page.getByRole('navigation', { name: 'Conta do colecionador' }).getByRole('link', { name: 'Pedidos', exact: true }).click()
  await expect(page.getByTestId('account-summary')).toContainText('0 pedidos')
  const wallet = (await api<{ items: Wallet[] }>(page, '/wallets')).data.items[0]!
  await api(page, `/wallets/${wallet.id}/connection`, 'POST', { network: wallet.network })
  const quote = (await api<Quote>(page, '/quotes', 'POST', { walletId: wallet.id, network: wallet.network })).data
  const created = await page.evaluate(async ({ wallet, quote }) => (await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('jungle-marketplace.session')}`, 'Idempotency-Key': 'realtime-bruno' }, body: JSON.stringify({ quoteId: quote.id, walletId: wallet.id, network: wallet.network, collector: { displayName: 'Bruno', username: 'bruno', email: 'bruno@example.test', profileName: 'bruno' } }) })).status, { wallet, quote })
  expect(created).toBe(201)
  await expect(page.getByTestId('account-summary')).toContainText('1 pedidos')
  await ready(page)
})

test('timeout com evento perdido e reconexão preserva chave/corpo e recupera a mesma compra', async ({ page }) => {
  test.setTimeout(45000)
  await checkout(page)
  await scenario(page, 'order-timeout')
  const posts: { key: string | undefined; body: string | null }[] = []
  page.on('request', (request) => { if (orderPost(request)) posts.push({ key: request.headers()['idempotency-key'], body: request.postData() }) })
  await confirm(page)
  await expect.poll(async () => (await transport(page)).events.some((event) => event.type === 'order.updated')).toBe(true)
  await control(page, { action: 'disconnect' })
  await expect(page.getByRole('heading', { name: 'Verificando resultado da tentativa', exact: true })).toBeVisible({ timeout: 15000 })
  await resume(page)
  expect(posts).toHaveLength(1)
  await page.getByRole('button', { name: 'Recuperar mesma tentativa' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada', exact: true })).toBeVisible()
  expect(posts).toHaveLength(2)
  expect(posts[1]).toEqual(posts[0])
  expect((await api<{ items: Order[] }>(page, '/orders')).data.items).toHaveLength(2)
})
