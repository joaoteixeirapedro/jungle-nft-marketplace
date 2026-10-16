import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { env } from '@/lib/env'
import { diagnosticsFixture } from '@/mocks/data/diagnostics'
import type { ServerReadyPayload } from '@/types/diagnostics'
import type { DomainEvent } from '@/mocks/state/store'
import { realtimeHeld, registerMockConnection } from '@/mocks/state/realtime-runtime'

// MSW 2.15 normalizes Socket.IO's /socket.io/ transport path to namespace /.
const socketUrl = new URL('/', env.socketUrl)
socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
const realtime = ws.link(socketUrl.href)

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    if (realtimeHeld()) { connection.client.close(4001, 'Interrupção simulada'); return }
    // Published 0.2.0 uses toSocketIo, not the unreleased SocketIo protocol API.
    // This binding implements the Engine.IO + Socket.IO namespace handshake.
    const socket = toSocketIo(connection)
    const subscription = { token: null as string | null, ready: false, close: () => connection.client.close(4001, 'Interrupção simulada'), send: (event: DomainEvent) => {
      if (event.type === 'nft.updated') socket.client.emit('nft.updated', event.payload)
      else socket.client.emit('order.updated', event.payload)
    } }
    const unsubscribe = registerMockConnection(connection.client.id, subscription)

    socket.client.on('client:ready', (_event, input: unknown) => {
      subscription.token = input && typeof input === 'object' && 'sessionToken' in input && typeof input.sessionToken === 'string' ? input.sessionToken : null
      subscription.ready = true
      const payload: ServerReadyPayload = {
        service: 'nft-marketplace-socket',
        connectionId: connection.client.id,
        connectedAt: diagnosticsFixture.connectedAt,
      }
      socket.client.emit('server:ready', payload)
    })

    // The binding advertises a 25 s ping interval but does not schedule pings.
    // Supply Engine.IO heartbeats; cleanup when the intercepted socket closes.
    const heartbeat = setInterval(() => connection.client.send('2'), 20_000)
    connection.client.addEventListener('close', () => { clearInterval(heartbeat); unsubscribe() })
  }),
]
