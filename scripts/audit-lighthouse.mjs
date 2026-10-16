import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from '@playwright/test'
import { lighthouseConfig } from '../lighthouse.config.mjs'

const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4173'
const phase = process.env.AUDIT_PHASE ?? 'final-delivery'
const runs = Number(process.env.AUDIT_RUNS ?? 3)
const directory = `docs/lighthouse/${phase}`
const buildIndexSha256 = createHash('sha256').update(await readFile('dist/index.html')).digest('hex')
await mkdir(directory, { recursive: true })
const results = []
for (const [page, path] of [['home', '/'], ['detail', '/nfts/nft-001']]) {
  for (const profile of ['desktop', 'mobile']) {
    for (let run = 1; run <= runs; run++) {
      const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless', '--no-first-run', '--disable-extensions'] })
      try {
        const result = await lighthouse(`${base}${path}`, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, lighthouseConfig(profile))
        if (!result || result.lhr.runtimeError) throw new Error(JSON.stringify(result?.lhr.runtimeError ?? 'No result'))
        const name = `${page}-${profile}-${run}`
        await Promise.all(result.report.map((report, i) => writeFile(`${directory}/${name}.${i ? 'json' : 'html'}`, report)))
        const lhr = result.lhr
        const requests = lhr.audits['network-requests'].details.items
        if (!requests.some((request) => request.url.includes('/api/nfts') && request.statusCode === 200) || !requests.some((request) => request.url.includes('/assets/artwork/') && request.statusCode === 200)) throw new Error('Audit did not load the REST catalog and real artwork')
        const row = {
          name, page, profile, run, lighthouseVersion: lhr.lighthouseVersion, fetchTime: lhr.fetchTime,
          settings: lhr.configSettings, environment: lhr.environment,
          scores: Object.fromEntries(Object.entries(lhr.categories).map(([key, value]) => [key, Math.round(value.score * 100)])),
          metrics: Object.fromEntries(['largest-contentful-paint', 'first-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'total-byte-weight'].map((key) => [key, lhr.audits[key]?.numericValue])),
          warnings: lhr.runWarnings,
        }
        results.push(row)
        await writeFile(`${directory}/summary.json`, JSON.stringify({ base, phase, node: process.version, buildIndexSha256, results }, null, 2) + '\n')
        console.log(name, JSON.stringify(row.scores), JSON.stringify(row.metrics))
      } finally {
        await chrome.kill()
      }
    }
  }
}
const median = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)]
const medians = []
for (const page of ['home', 'detail']) for (const profile of ['desktop', 'mobile']) {
  const rows = results.filter((row) => row.page === page && row.profile === profile)
  medians.push({ page, profile, runs: rows.length,
    scores: Object.fromEntries(Object.keys(rows[0].scores).map((key) => [key, median(rows.map((row) => row.scores[key]))])),
    metrics: Object.fromEntries(Object.keys(rows[0].metrics).map((key) => [key, median(rows.map((row) => row.metrics[key]))])),
  })
}
await writeFile(`${directory}/summary.json`, JSON.stringify({ base, phase, node: process.version, buildIndexSha256, results, medians }, null, 2) + '\n')
console.log('Medians', JSON.stringify(medians))
