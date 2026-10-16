import type { Socket } from 'socket.io-client'
import { initializeMocks } from '@/app/bootstrap'
import { env } from '@/lib/env'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/diagnostics'

await initializeMocks()
const { io } = await import('socket.io-client')
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(env.socketUrl, {
  autoConnect: false,
  transports: ['websocket'],
  upgrade: false,
  reconnectionAttempts: 3,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 1_000,
  randomizationFactor: 0,
  timeout: 5_000,
})
