import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'preload-bootstrap-modules',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        // Fetch/compile in parallel; execution still waits for worker.start().
        return Object.values(bundle ?? {}).filter((item) => item.type === 'chunk' && ['/src/mocks/browser.ts', '/src/app/app.tsx'].some((path) => item.facadeModuleId?.replaceAll('\\', '/').endsWith(path))).map((item) => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: '', href: `/${item.fileName}` }, injectTo: 'head' as const }))
      },
    },
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
