import { delay, HttpResponse } from 'msw'
import { env } from '../lib/env.ts'
import { MockError, record } from './errors.ts'
import { transaction } from './state/store.ts'
import type { Identity } from './domain/session.ts'

export const apiPath = (path: string) => `${env.apiBaseUrl.replace(/\/$/, '')}${path}`
export function identity(request: Request): Identity {
  const authorization = request.headers.get('Authorization')
  if (authorization && !/^Bearer [^\s]+$/.test(authorization)) throw new MockError(401, 'INVALID_SESSION', 'Authorization inválido.')
  return { token: authorization?.slice(7) ?? null, guestId: request.headers.get('X-Guest-Id') }
}
export async function jsonBody(request: Request) {
  try { return record(JSON.parse(await request.text() || '{}')) } catch (error) {
    if (error instanceof MockError) throw error
    throw new MockError(400, 'MALFORMED_JSON', 'Corpo JSON inválido.')
  }
}

export async function respond(work: () => Response | Promise<Response>, request?: Request): Promise<Response> {
  try {
    let latency = 0
    if (request) {
      const plan = await transaction((db) => {
        const path = new URL(request.url).pathname
        const key = `${request.method} ${path}`
        const attempt = db.scenario.requests[key] = (db.scenario.requests[key] ?? 0) + 1
        const name = db.scenario.name
        return { name, attempt, purchase: /\/(orders|wallets|profile)(?:\/.*)?$/.test(path), cart: /\/(cart(?:\/.*)?|quotes)$/.test(path), catalog: request.method === 'GET' && /\/nfts(?:\/[^/]+)?$/.test(path), auth: /\/(session|accounts)$/.test(path) }
      })
      if (plan.auth && plan.name === 'malformed-session') return HttpResponse.json({ status: 'unexpected' })
      if ((plan.catalog || plan.auth || plan.cart || plan.purchase) && plan.name === 'network-error') return HttpResponse.error()
      if ((plan.catalog || plan.auth || plan.cart || plan.purchase) && (plan.name === 'server-error' || (plan.name === 'transient-error' && plan.attempt === 1))) throw new MockError(503, 'SERVICE_UNAVAILABLE', 'Falha temporária simulada. Tente novamente.')
      if (plan.name === 'validation-error' && ['POST', 'PUT', 'PATCH'].includes(request.method)) throw new MockError(422, 'VALIDATION_ERROR', 'Falha de validação simulada.', { form: 'Cenário determinístico de validação.' })
      latency = plan.name === 'slow' ? 800 : (plan.catalog || plan.cart || plan.purchase) && plan.name === 'out-of-order' ? (plan.attempt % 2 ? 600 : 20) : 0
    }
    const response = await work()
    if (latency) await delay(latency)
    return response
  } catch (error) {
    if (error instanceof MockError) return HttpResponse.json(error.problem, { status: error.status })
    console.error('Erro inesperado no mock:', error)
    return HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Erro interno na simulação.' }, { status: 500 })
  }
}

