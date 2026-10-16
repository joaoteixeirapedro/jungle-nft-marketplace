import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function ready(page: Page) {
  await expect(page.locator('.shimmer').filter({ visible: true })).toHaveCount(0)
  const realtime = page.locator('main[data-realtime-state]')
  if (await realtime.count()) await expect(realtime).toHaveAttribute('data-realtime-state', 'ready')
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => page.locator('img:visible').evaluateAll((images) => images.filter((image) => { const rect = image.getBoundingClientRect(); return rect.top < innerHeight && rect.bottom > 0 }).every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
}

async function login(page: Page) {
  await page.goto('/login?redirect=%2Fprofile')
  await page.getByLabel('E-mail', { exact: true }).fill('alice@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('Demo#2026')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByTestId('account-identity')).toHaveText('alice')
  await ready(page)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/marketplace')
  await expect(page.getByTestId('nft-card').first()).toBeVisible()
  const status = await page.evaluate(async () => (await fetch('/api/__mock/reset', { method: 'POST' })).status)
  expect(status).toBe(200)
  await ready(page)
})

test('auditoria: baselines de início, detalhe e carrinho com dados estáveis', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
  await ready(page)
  await expect(page).toHaveScreenshot('home.png', { fullPage: true, animations: 'disabled' })
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  await ready(page)
  await expect(page).toHaveScreenshot('detail.png', { fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).click()
  await expect(page.getByTestId('cart-totals')).toHaveAttribute('data-current', 'true')
  await ready(page)
  await expect(page).toHaveScreenshot('cart.png', { fullPage: true, animations: 'disabled', mask: [page.locator('.cart-quote-expiry')] })
})

test('auditoria: acessibilidade automatizada das telas e revisão de compra', async ({ page }, info) => {
  test.setTimeout(120000)
  const scan = async (name: string) => {
    await ready(page)
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
    await info.attach(`${name}-axe`, { body: JSON.stringify(result, null, 2), contentType: 'application/json' })
    expect.soft(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })), name).toEqual([])
  }
  for (const path of ['/', '/marketplace', '/nfts/nft-001', '/login', '/register']) {
    await page.goto(path)
    if (path === '/' || path === '/marketplace') await expect(page.getByTestId('nft-card').first()).toBeVisible()
    else if (path.startsWith('/nfts')) await expect(page.locator('.nft-detail')).toBeVisible()
    else await expect(page.getByRole('dialog')).toBeVisible()
    await scan(path.replaceAll('/', '') || 'home')
  }
  await login(page)
  for (const path of ['/profile', '/wallets', '/favorites', '/orders', '/orders/order-demo-alice', '/cart', '/checkout']) {
    await page.goto(path)
    if (path !== '/cart') await expect(page.getByTestId('account-identity')).toHaveText('alice')
    if (path === '/cart') await expect(page.getByTestId('cart-totals')).toBeVisible()
    if (path === '/checkout') await expect(page.getByRole('button', { name: 'Conectar carteira simulada', exact: true })).toBeVisible()
    await scan(path.slice(1).replaceAll('/', '-'))
  }
  await page.getByRole('button', { name: 'Conectar carteira simulada', exact: true }).click()
  await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Revisar compra simulada' })).toBeVisible()
  await scan('purchase-review')
})

test('auditoria: teclado, foco do drawer, zoom e larguras intermediárias', async ({ page, isMobile }, info) => {
  test.setTimeout(90000)
  const unexpected: string[] = []
  page.on('pageerror', (error) => unexpected.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') unexpected.push(message.text()) })
  page.on('requestfailed', (request) => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') unexpected.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`) })
  await page.goto('/marketplace')
  await expect(page.getByTestId('nft-card').first()).toBeVisible()
  if (isMobile) {
    const nav = page.getByRole('navigation', { name: 'Navegação mobile' })
    const cart = await nav.getByRole('link', { name: /^Carrinho/ }).boundingBox()
    const account = await nav.getByRole('link', { name: 'Entrar', exact: true }).boundingBox()
    const width = page.viewportSize()!.width
    expect(cart!.x + cart!.width / 2).toBeGreaterThan(width * .6)
    expect(account!.x + account!.width / 2).toBeGreaterThan(width * .8)
    const trigger = page.getByRole('button', { name: 'Filtros', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Filtros do catálogo', exact: true })
    await expect(dialog.getByRole('button', { name: 'Fechar filtros', exact: true })).toBeFocused()
    const network = dialog.getByRole('checkbox', { name: 'Ethereum', exact: true })
    await network.focus()
    await page.keyboard.press('Space')
    await expect(network).toBeChecked()
    await page.keyboard.press('Space')
    await expect(network).not.toBeChecked()
    await dialog.getByRole('button', { name: 'Fechar filtros', exact: true }).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('button', { name: 'Ver resultados', exact: true })).toBeFocused()
    await page.keyboard.press('Space')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  } else {
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('searchbox')).toBeFocused()
    await page.locator('.footer-links').getByRole('link', { name: 'Meu perfil', exact: true }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile$/)
    await expect(page.getByRole('dialog', { name: 'Entrar', exact: true })).toBeVisible()
  }
  await login(page)
  const measurements: object[] = []
  // The two projects exercise narrow mobile and notebook/tablet respectively.
  for (const width of isMobile ? [320, 390] : [768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/marketplace', '/nfts/nft-001', '/cart', '/checkout', '/profile', '/wallets', '/orders/order-demo-alice']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await ready(page)
      const geometry = await page.evaluate(() => ({ width: innerWidth, contentWidth: document.documentElement.scrollWidth }))
      measurements.push({ path, ...geometry })
      expect.soft(geometry.contentWidth, `${path} at ${width}`).toBeLessThanOrEqual(width)
    }
  }
  // 1280px at 200% zoom has a 640 CSS-pixel viewport; test reflow without
  // transform scaling (which would not model browser zoom layout).
  await page.setViewportSize({ width: 640, height: 450 })
  await page.goto('/profile')
  await expect(page.locator('.profile-form input[type="email"]')).toBeVisible()
  await page.getByRole('button', { name: 'Salvar senha', exact: true }).focus()
  const focused = await page.evaluate(() => { const rect = document.activeElement!.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, height: innerHeight } })
  expect(focused.top).toBeGreaterThanOrEqual(0)
  expect(focused.bottom).toBeLessThanOrEqual(focused.height)
  await info.attach('responsive-geometry', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' })
  expect(unexpected).toEqual([])
})

