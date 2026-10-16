import { expect, test, type Page } from '@playwright/test'
import type { NftDetail } from '../../src/types/marketplace.ts'

async function scenario(page: Page, name: string, reset = false) {
  const status = await page.evaluate(async ({ name, reset }) => (await fetch(`/api/__mock/${reset ? 'reset' : 'scenario'}`, { method: reset ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: name }) })).status, { name, reset })
  expect(status).toBe(200)
}
const catalog = (page: Page) => page.getByRole('region', { name: 'Todos os NFTs' })
async function filters(page: Page) {
  const toggle = page.getByRole('button', { name: /^Filtros/ })
  if (await toggle.isVisible()) {
    await toggle.click()
    await expect(page.getByRole('button', { name: 'Fechar filtros' })).toBeFocused()
    return page.getByRole('dialog')
  }
  return page.getByRole('complementary', { name: 'Filtros do catálogo' })
}
async function closeFilters(page: Page) {
  if (await page.getByRole('dialog').isVisible()) await page.getByRole('button', { name: 'Ver resultados' }).click()
}
async function sortBy(page: Page, value: string) {
  if (await page.locator('.desktop-sort').isVisible()) await page.locator('.desktop-sort').getByLabel('Ordenar por:').selectOption(value)
  else { const panel = await filters(page); await panel.getByLabel('Ordenar por:').selectOption(value); await closeFilters(page) }
}
test.beforeEach(async ({ page }) => {
  await page.goto('/marketplace')
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(9)
  await scenario(page, 'default', true)
  await page.reload()
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(9)
})

test('Home recebe dados REST e card navega com o identificador da API', async ({ page }) => {
  const response = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/nfts/nft-001')
  await page.goto('/')
  const featured = await response
  expect(featured.fromServiceWorker()).toBe(true)
  const nft = await featured.json() as NftDetail
  const highlight = page.getByRole('region', { name: 'NFT em destaque' })
  const heroImage = highlight.getByRole('link', { name: `Ver ${nft.name}`, exact: true }).getByRole('img')
  await expect(heroImage).toHaveAttribute('src', nft.image.src!)
  await expect(heroImage).toHaveAttribute('alt', nft.image.alt)
  await expect.poll(() => heroImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  await highlight.getByRole('link', { name: `Ver ${nft.name}`, exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/nfts/${nft.id}(?:\\?|$)`))
  await expect(page.getByRole('heading', { name: nft.name })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao catálogo' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/SEJA DONO/)
})

test('combina busca, categoria e rede; limpar busca mantém filtros e restaura histórico', async ({ page }) => {
  const panel = await filters(page)
  await panel.getByRole('checkbox', { name: 'Arte digital', exact: true }).check()
  await panel.getByRole('checkbox', { name: 'Ethereum', exact: true }).check()
  await closeFilters(page)
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(2)
  const filteredUrl = page.url()
  await page.getByRole('searchbox', { name: 'Pesquisar NFTs' }).fill('Emerald')
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(1)
  await expect(catalog(page).getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('q')).toBe('Emerald')
  await page.reload()
  await expect(page.getByRole('searchbox')).toHaveValue('Emerald')
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Limpar busca', exact: true }).click()
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(2)
  expect(new URL(page.url()).searchParams.has('q')).toBe(false)
  await page.goBack()
  await expect(page.getByRole('searchbox')).toHaveValue('Emerald')
  await page.goBack()
  await expect(page).toHaveURL(filteredUrl)
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(2)
  await page.goForward()
  await expect(page.getByRole('searchbox')).toHaveValue('Emerald')
})

test('ordenação e paginação usam a API e preservam filtros; valida preços e URL', async ({ page }) => {
  const requests: URL[] = []
  page.on('request', (request) => { const url = new URL(request.url()); if (url.pathname === '/api/nfts') requests.push(url) })
  await page.getByRole('searchbox').fill('Kurio')
  await expect(page).toHaveURL(/q=Kurio/)
  const panel = await filters(page)
  await panel.getByRole('checkbox', { name: 'Ethereum', exact: true }).check()
  await panel.getByLabel('Mínimo', { exact: true }).fill('0')
  await panel.getByLabel('Máximo', { exact: true }).fill('-1')
  await panel.getByRole('button', { name: 'Aplicar preço' }).click()
  await expect(panel.getByRole('alert')).toContainText('Informe valores em ETH válidos')
  await panel.getByLabel('Máximo', { exact: true }).fill('')
  await panel.getByRole('button', { name: 'Aplicar preço' }).click()
  await closeFilters(page)
  await sortBy(page, 'price-asc')
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(9)
  await expect(catalog(page).getByTestId('nft-card').first()).toHaveAttribute('data-nft-id', 'nft-001')
  await page.getByRole('button', { name: 'Página 2', exact: true }).click()
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(1)
  await expect(catalog(page).getByTestId('nft-card').first()).toHaveAttribute('data-nft-id', 'nft-028')
  const last = requests.at(-1)!.searchParams
  expect(Object.fromEntries(last)).toMatchObject({ q: 'Kurio', network: 'ethereum', minPrice: '0.0', sort: 'price-asc', page: '2', pageSize: '9' })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Página 2', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled()
  await sortBy(page, 'price-desc')
  await expect(page.getByRole('button', { name: 'Página 1', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(catalog(page).getByTestId('nft-card').first()).toHaveAttribute('data-nft-id', 'nft-028')
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Página 2', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('searchbox')).toHaveValue('Kurio')
  await page.goForward()
  await expect(page.getByRole('button', { name: 'Página 1', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(catalog(page).getByTestId('nft-card').first()).toHaveAttribute('data-nft-id', 'nft-028')
  await page.goto('/marketplace?page=999&sort=wrong&category=invalid&minPrice=abc')
  await expect(page.getByRole('button', { name: 'Página 4', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(3)
  const sortPanel = await filters(page)
  const sortSelect = await page.locator('.desktop-sort').isVisible() ? page.locator('.desktop-sort').getByLabel('Ordenar por:') : sortPanel.getByLabel('Ordenar por:')
  await expect(sortSelect).toHaveValue('recent')
  await closeFilters(page)
})

test('requisição antiga não sobrescreve pesquisa nova e vazio pode ser limpo', async ({ page }) => {
  await scenario(page, 'out-of-order')
  await page.getByRole('searchbox').fill('Emerald')
  await page.waitForRequest((r) => new URL(r.url()).searchParams.get('q') === 'Emerald')
  await page.getByRole('searchbox').fill('Sage')
  await expect(catalog(page).getByRole('heading', { name: 'Sage Nomad #009' })).toBeVisible()
  // A later DOM assertion, after the old handler finishes, proves it cannot regress.
  await page.waitForTimeout(650)
  await expect(catalog(page).getByRole('heading', { name: 'Sage Nomad #009' })).toBeVisible()
  await expect(catalog(page).getByRole('heading', { name: 'Emerald Ape #042' })).toHaveCount(0)
  await page.getByRole('searchbox').fill('inexistente')
  await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
  await page.getByRole('button', { name: 'Limpar pesquisa e filtros' }).click()
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(9)
})

test('erro recupera por retry, shimmer respeita movimento reduzido e layout não transborda', async ({ page }) => {
  await scenario(page, 'server-error')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar os NFTs' })).toBeVisible({ timeout: 15000 })
  await scenario(page, 'slow')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(catalog(page).getByTestId('catalog-skeleton')).toBeVisible()
  expect(await page.getByTestId('catalog-skeleton').locator('.shimmer').first().evaluate((element) => getComputedStyle(element, '::after').animationName)).toBe('none')
  await expect(catalog(page).getByTestId('nft-card')).toHaveCount(9)
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.goto('/nfts/inexistente')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})

test('assets locais e ações futuras mantêm avisos honestos com foco recuperável', async ({ page, isMobile }) => {
  const externalAssets: string[] = []
  page.on('request', (request) => {
    if (['image', 'font'].includes(request.resourceType()) && new URL(request.url()).origin !== new URL(page.url()).origin) externalAssets.push(request.url())
  })
  await page.goto('/')
  const image = page.getByRole('region', { name: 'NFT em destaque' }).getByRole('link').getByRole('img')
  await expect(image).toHaveAttribute('src', '/assets/artwork/8f387-1254.webp')
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0 && element.currentSrc.includes('/assets/artwork/8f387-'))).toBe(true)
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('14px "Roboto Mono"'))).toBe(true)
  if (isMobile) await page.goto('/nfts/nft-001')
  const trigger = isMobile ? page.getByRole('button', { name: 'Avaliações de colecionadores', exact: true }) : page.getByRole('button', { name: 'Aprenda', exact: true })
  await trigger.click()
  await expect(page.getByRole('dialog', { name: 'Recurso indisponível' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entendi', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Entendi', exact: true }).press('Escape')
  await expect(trigger).toBeFocused()
  expect(externalAssets).toEqual([])
})
