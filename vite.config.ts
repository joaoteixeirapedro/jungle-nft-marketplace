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
        // Include static dependencies: preloading only the entry chunks leaves a
        // second network waterfall after MSW starts. This never executes modules.
        const files = new Set<string>()
        const preload = (file: string) => {
          if (files.has(file)) return
          const chunk = bundle?.[file]
          if (chunk?.type !== 'chunk') return
          files.add(file)
          chunk.imports.forEach(preload)
        }
        Object.values(bundle ?? {}).forEach((item) => {
          if (item.type === 'chunk' && ['/src/mocks/browser.ts', '/src/app/app.tsx'].some((path) => item.facadeModuleId?.replaceAll('\\', '/').endsWith(path))) preload(item.fileName)
        })
        return [...files].map((file) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${file}` },
          injectTo: 'head' as const,
        }))
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
