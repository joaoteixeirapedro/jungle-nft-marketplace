import type { NftUpdatedEvent, OrderUpdatedEvent } from './marketplace.ts'

export interface HealthResponse {
  status: 'ok'
  service: 'nft-marketplace-mock'
}

export interface ServerReadyPayload {
  service: 'nft-marketplace-socket'
  connectionId: string
  connectedAt: string
}

export interface ServerToClientEvents {
  'server:ready': (payload: ServerReadyPayload) => void
  'nft.updated': (payload: NftUpdatedEvent) => void
  'order.updated': (payload: OrderUpdatedEvent) => void
}

export interface ClientToServerEvents {
  'client:ready': (payload?: { sessionToken?: string | null }) => void
}
