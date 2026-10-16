import { expect, test } from '@playwright/test'

test('abre a aplicação e navega pelo Router', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /SEJA DONO/ })).toBeVisible()
  await page.getByRole('link', { name: 'Abrir diagnóstico' }).click()
  await expect(page).toHaveURL(/\/dev\/diagnostics$/)
  await expect(page.getByTestId('react-status')).toHaveText('Funcionando')
})

test('recupera rota direta após refresh e trata rota inexistente', async ({ page }) => {
  await page.goto('/dev/diagnostics')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Diagnóstico da aplicação' })).toBeVisible()
  await page.goto('/rota-inexistente')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('Axios e Query recebem health interceptado pelo service worker', async ({ page }) => {
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/health')
  await page.goto('/dev/diagnostics')
  const response = await responsePromise
  expect(response.fromServiceWorker()).toBe(true)
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ status: 'ok', service: 'nft-marketplace-mock' })
  await expect(page.getByTestId('health-response')).toContainText('nft-marketplace-mock')
})

test('Socket.IO conecta via MSW, recebe evento e reconecta sem polling', async ({ page }) => {
  const pollingRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).searchParams.get('transport') === 'polling') pollingRequests.push(request.url())
  })
  await page.goto('/dev/diagnostics')
  await expect(page.getByTestId('socket-status')).toHaveText('Conectado')
  await expect(page.getByTestId('socket-event-status')).toHaveText('Recebido')
  await expect(page.getByTestId('socket-event')).toContainText('nft-marketplace-socket')
  await page.getByRole('button', { name: 'Desconectar', exact: true }).click()
  await expect(page.getByTestId('socket-status')).toHaveText('Desconectado')
  await expect(page.getByTestId('socket-event-status')).toHaveText('Aguardando conexão/evento')
  await page.getByRole('button', { name: 'Conectar', exact: true }).click()
  await expect(page.getByTestId('socket-status')).toHaveText('Conectado')
  await expect(page.getByTestId('socket-event-status')).toHaveText('Recebido')
  expect(pollingRequests).toEqual([])
})
