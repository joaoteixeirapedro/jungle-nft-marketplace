import { defineConfig } from '@playwright/test'
import config from './playwright.config.ts'

export default defineConfig({
  ...config,
  outputDir: './test-results/production',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/production' }]],
  use: { ...config.use, baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
})
