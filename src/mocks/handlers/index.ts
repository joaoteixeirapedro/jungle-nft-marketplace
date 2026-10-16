import { healthHandlers } from '@/mocks/handlers/health'
import { realtimeHandlers } from '@/mocks/handlers/realtime'
import { catalogHandlers } from '@/mocks/handlers/catalog'
import { accountHandlers } from '@/mocks/handlers/accounts'
import { accountResourceHandlers } from '@/mocks/handlers/account-resources'
import { cartHandlers } from '@/mocks/handlers/cart'
import { orderHandlers } from '@/mocks/handlers/orders'
import { controlHandlers } from '@/mocks/handlers/controls'

// Static files never belong to the REST simulation. Match them once instead of
// parsing every asset against all domain handlers during a cold page load.
const staticAssets = http.get(/^https?:\/\/[^/]+\/(?:assets|fonts)\//, () => passthrough())
export const handlers = [staticAssets, ...healthHandlers, ...realtimeHandlers, ...controlHandlers, ...catalogHandlers, ...accountHandlers, ...accountResourceHandlers, ...cartHandlers, ...orderHandlers]
import { http, passthrough } from 'msw'
