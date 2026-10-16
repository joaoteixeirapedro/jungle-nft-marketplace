import { delay, http, HttpResponse } from 'msw'
import { env } from '@/lib/env'
import { healthFixture } from '@/mocks/data/diagnostics'
import { diagnosticsScenario } from '@/mocks/scenarios'

export const healthHandlers = [
  http.get(`${env.apiBaseUrl.replace(/\/$/, '')}/health`, async () => {
    await delay(diagnosticsScenario.healthLatencyMs)
    return HttpResponse.json(healthFixture)
  }),
]
