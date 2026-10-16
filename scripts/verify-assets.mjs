import { chromium, expect } from '@playwright/test'
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises'
import sharp from 'sharp'

const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4173'
await mkdir('docs/assets', { recursive: true })
const browser = await chromium.launch()
const results = { base, pixelComparisons: [], screens: [], inventory: [] }
try {
  const page = await browser.newPage()
  await page.goto(base)
  await expect(page.locator('.hero-main-image')).toBeVisible()
  for (const name of ['8f387', '83794', '9add2', 'b7cfc']) {
    const source = `data:image/png;base64,${(await readFile(`assets/originals/figma/${name}.png`)).toString('base64')}`
    const comparison = await page.evaluate(async ({ source, optimized }) => {
      const pixels = async (src) => {
        const image = new Image(); image.src = src; await image.decode()
        const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
        const context = canvas.getContext('2d'); context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, canvas.width, canvas.height).data
      }
      const [a, b] = await Promise.all([pixels(source), pixels(optimized)])
      let differingChannels = 0
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differingChannels++
      return { comparedChannels: a.length, differingChannels }
    }, { source, optimized: `${base}/assets/artwork/${name}-1254.webp` })
    if (comparison.differingChannels) throw new Error(`Browser color mismatch: ${name}`)
    results.pixelComparisons.push({ name, ...comparison })
  }
  await page.close()
  for (const [width, dpr] of [[390, 1], [390, 2], [768, 1], [1440, 1], [1440, 2]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr })
    const screen = await context.newPage()
    const errors = []
    screen.on('pageerror', (error) => errors.push(error.message))
    const assets = new Map()
    const responses = []
    screen.on('response', (response) => {
      if (response.request().resourceType() === 'image' && response.url().startsWith(base)) responses.push(response.body().then((data) => assets.set(response.url(), data.length)))
    })
    for (const route of ['/', '/marketplace', '/nfts/nft-001']) {
      assets.clear(); responses.length = 0
      await screen.goto(`${base}${route}`)
      await expect(screen.locator('main')).toHaveAttribute('data-realtime-state', 'ready')
      await expect(screen.locator('.shimmer').filter({ visible: true })).toHaveCount(0)
      await screen.evaluate(() => document.fonts.ready)
      await expect.poll(() => screen.locator('img:visible').evaluateAll((images) => images.filter((image) => image.getBoundingClientRect().top < innerHeight).every((image) => image.complete && image.naturalWidth > 0))).toBe(true)
      const images = await screen.locator('img:visible').evaluateAll((images) => images.map((image) => ({ source: image.currentSrc, naturalWidth: image.naturalWidth, renderedWidth: image.getBoundingClientRect().width })))
      const overflow = await screen.evaluate(() => document.documentElement.scrollWidth > innerWidth)
      if (overflow || errors.length) throw new Error(JSON.stringify({ width, dpr, route, overflow, errors }))
      const screenshot = `docs/assets/${route === '/' ? 'home' : route === '/marketplace' ? 'catalog' : 'detail'}-${width}-dpr${dpr}.png`
      await screen.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' })
      await Promise.all(responses)
      results.screens.push({ width, dpr, route, screenshot, images, overflow, errors: [...errors], requestedImageBytes: [...assets.values()].reduce((a, b) => a + b, 0), assets: Object.fromEntries(assets) })
    }
    await context.close()
  }
  async function inventory(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`
      if (entry.isDirectory()) await inventory(path)
      else if (/\.(png|webp|svg|jpe?g)$/i.test(entry.name)) {
        const metadata = /\.svg$/i.test(path) ? await readFile(path, 'utf8').then((svg) => {
          const root = svg.match(/<svg[^>]+>/)?.[0] ?? ''
          return { format: 'svg', width: Number(root.match(/\bwidth="([\d.]+)"/)?.[1]), height: Number(root.match(/\bheight="([\d.]+)"/)?.[1]) }
        }) : await sharp(path).metadata()
        results.inventory.push({ path, format: metadata.format, width: metadata.width, height: metadata.height, bytes: (await stat(path)).size })
      }
    }
  }
  await inventory('public/assets')
  await writeFile('docs/assets/verification.json', JSON.stringify(results, null, 2) + '\n')
  console.log('Verified:', results.pixelComparisons.length, 'full-resolution browser pixel comparisons;', results.screens.length, 'responsive captures;', results.inventory.length, 'local images')
} finally { await browser.close() }
/* global Image, document, innerHeight, innerWidth */
