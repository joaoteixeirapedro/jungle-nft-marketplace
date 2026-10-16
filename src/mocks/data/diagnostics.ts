import type { HealthResponse } from '@/types/diagnostics'

export const healthFixture: HealthResponse = {
  status: 'ok',
  service: 'nft-marketplace-mock',
}

export const diagnosticsFixture = {
  connectedAt: '2026-01-01T00:00:00.000Z',
} as const
