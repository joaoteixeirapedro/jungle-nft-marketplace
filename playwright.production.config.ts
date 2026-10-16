import { defineConfig } from '@playwright/test'
import config from './playwright.config.ts'

const publicUrl = process.env.PLAYWRIGHT_BASE_URL
const target = publicUrl ? 'public' : 'production'
const port = process.env.PLAYWRIGHT_PORT ?? '4173'
const localUrl = `http://127.0.0.1:${port}`

export default defineConfig({
  ...config,
  outputDir: `./test-results/${target}`,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `playwright-report/${target}` }],
    ['json', { outputFile: `test-results/${target}/results.json` }],
  ],
  use: { ...config.use, baseURL: publicUrl ?? localUrl },
  webServer: publicUrl ? undefined : {
    command: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: localUrl,
    reuseExistingServer: false,
  },
})
