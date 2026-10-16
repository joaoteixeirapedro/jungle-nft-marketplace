import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'

const names = ['8f387', '83794', '9add2', 'b7cfc']
const widths = [320, 640, 1254]
const output = 'public/assets/artwork'
const previousReport = JSON.parse(await readFile('docs/assets/optimization.json', 'utf8').catch(() => 'null'))
await mkdir(output, { recursive: true })
await mkdir('docs/assets', { recursive: true })
const report = { encoder: `sharp ${sharp.versions.sharp}; libwebp ${sharp.versions.webp}`, lossless: true, widths, images: [] }
for (const name of names) {
  const original = await readFile(`assets/originals/figma/${name}.png`)
  const sha256 = createHash('sha256').update(original).digest('hex')
  const previousImage = previousReport?.images.find((image) => image.sha256 === sha256)
  if (previousReport?.pipeline === 1 && previousReport.encoder === report.encoder && JSON.stringify(previousReport.widths) === JSON.stringify(widths) && previousImage && (await Promise.all(previousImage.variants.map(async (variant) => createHash('sha256').update(await readFile(variant.path).catch(() => '')).digest('hex') === variant.sha256))).every(Boolean)) {
    report.images.push(previousImage)
    continue
  }
  const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const variants = []
  for (const width of widths) {
    const pipeline = sharp(data, { raw: info })
    if (width !== info.width) pipeline.resize(width, width, { kernel: 'lanczos3' })
    const buffer = await pipeline.webp({ lossless: true, effort: 6 }).toBuffer()
    const path = `${output}/${name}-${width}.webp`
    // Equal buffers are left untouched, keeping repeated builds deterministic.
    const previous = await readFile(path).catch(() => null)
    if (!previous?.equals(buffer)) await writeFile(path, buffer)
    const decoded = await sharp(buffer).ensureAlpha().raw().toBuffer()
    const fullResolutionPixelsIdentical = width === info.width ? data.equals(decoded) : null
    if (fullResolutionPixelsIdentical === false) throw new Error(`Lossless verification failed: ${path}`)
    variants.push({ path, width, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), fullResolutionPixelsIdentical })
  }
  report.images.push({ original: `assets/originals/figma/${name}.png`, bytes: original.length, width: info.width, height: info.height, sha256: createHash('sha256').update(original).digest('hex'), variants })
}
await writeFile('docs/assets/optimization.json', JSON.stringify({ pipeline: 1, ...report }, null, 2) + '\n')
const dimensions = {}
for (const file of await readdir('public/assets/figma')) {
  if (!/\.(svg|png)$/.test(file)) continue
  let width, height
  if (file.endsWith('.svg')) {
    const root = (await readFile(`public/assets/figma/${file}`, 'utf8')).match(/<svg[^>]+>/)?.[0] ?? ''
    width = Number(root.match(/\bwidth="([\d.]+)"/)?.[1])
    height = Number(root.match(/\bheight="([\d.]+)"/)?.[1])
  } else {
    const metadata = await sharp(`public/assets/figma/${file}`).metadata()
    width = metadata.width; height = metadata.height
  }
  // Fractional line exports retain their original intrinsic behavior.
  if (width >= 1 && height >= 1) dimensions[file] = [width, height]
}
const iconMetadata = `/** Intrinsic dimensions of original Figma exports; CSS still controls display size. */\nexport const designIconDimensions: Record<string, readonly [number, number]> = ${JSON.stringify(dimensions)}\n`
const iconPath = 'src/lib/design-icon-dimensions.ts'
if (await readFile(iconPath, 'utf8').catch(() => '') !== iconMetadata) await writeFile(iconPath, iconMetadata)
console.log(JSON.stringify(report, null, 2))
