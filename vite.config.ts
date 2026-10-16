import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'preload-mock-runtime',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        const runtime = Object.values(bundle ?? {}).find((item) => item.type === 'chunk' && item.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/mocks/browser.ts'))
        if (runtime?.type !== 'chunk') return []
        return [...new Set([runtime.fileName, ...runtime.imports])].map((file) => ({
          tag: 'link', attrs: { rel: 'modulepreload', crossorigin: '', href: `/${file}`, fetchpriority: 'low' }, injectTo: 'head' as const,
        }))
      },
    },
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Keep the initial UI together instead of fetching many tiny shared
          // chunks. Authentication, checkout and other routes stay lazy.
          groups: [{ name: 'marketplace', test: /[\\/]src[\\/](main\.tsx|app[\\/]app\.tsx)$/ }],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
