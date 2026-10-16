import { io, type Socket } from 'socket.io-client'
import { env } from '@/lib/env'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/diagnostics'

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
