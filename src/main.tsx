import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeMocks } from '@/app/bootstrap'
import { App } from '@/app/app'
import '@/styles/globals.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento raiz não encontrado.')

const root = createRoot(rootElement)
// Paint existing loading states while MSW initializes. API requests and the
// Socket.IO module wait for the same readiness promise before doing any I/O.
void initializeMocks().catch((error: unknown) => {
  console.error('Falha ao iniciar a aplicação:', error)
  root.unmount()
  rootElement.setAttribute('role', 'alert')
  rootElement.textContent = 'Não foi possível iniciar os mocks. Recarregue a página e verifique o service worker.'
})
root.render(<StrictMode><App /></StrictMode>)
