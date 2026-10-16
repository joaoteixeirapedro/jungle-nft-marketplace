import { env } from '@/lib/env'

let initialization: Promise<void> | undefined

export function initializeMocks() {
  return initialization ??= startMocks()
}

async function startMocks() {
  if (!env.mocksEnabled) return

  const { worker } = await import('@/mocks/browser')
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest(request, print) {
      // Let Vite/assets through. Unknown REST APIs must not silently succeed.
      if (new URL(request.url).pathname.startsWith('/api/')) print.error()
    },
    quiet: true,
  })
}
