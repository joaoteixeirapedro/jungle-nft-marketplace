import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeMocks } from '@/app/bootstrap'
import '@/styles/globals.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento raiz não encontrado.')

try {
  // Socket.IO captures WebSocket at import time, not only at connect time.
  // Load the app only after MSW installs its WebSocket interception.
  await initializeMocks()
  const { App } = await import('@/app/app')
  createRoot(rootElement).render(<StrictMode><App /></StrictMode>)
} catch (error) {
  console.error('Falha ao iniciar a aplicação:', error)
  rootElement.setAttribute('role', 'alert')
  rootElement.textContent = 'Não foi possível iniciar os mocks. Recarregue a página e verifique o service worker.'
}
