import { setupWorker } from 'msw/browser'
import { handlers } from '@/mocks/handlers'
import { startOrderRuntime } from '@/mocks/state/order-runtime'

startOrderRuntime()
export const worker = setupWorker(...handlers)
