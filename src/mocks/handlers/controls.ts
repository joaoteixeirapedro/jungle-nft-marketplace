import { delay, http, HttpResponse } from 'msw'
import { createFixtures } from '../data/marketplace.ts'
import { integer, invalid, text } from '../errors.ts'
import { apiPath, identity, jsonBody, respond } from '../http.ts'
import { interruptRealtime, realtimeMetadata, replayRealtime, resetRealtime, resumeRealtime } from '../state/realtime-runtime.ts'
import { updateNft } from '../domain/catalog.ts'
import { settleIfDue, settleOrder } from '../domain/orders.ts'
import { scenarioNames, type MockDatabase, type ScenarioName } from '../state/model.ts'
import { clearOrderTimers } from '../state/order-runtime.ts'
import { now, replaceDatabase, transaction, type DomainEvent } from '../state/store.ts'
import { eth } from './catalog.ts'

function scenarioName(value: unknown): ScenarioName {
  if (!scenarioNames.includes(value as ScenarioName)) invalid('scenario', `Cenário inválido. Opções: ${scenarioNames.join(', ')}.`)
  return value as ScenarioName
}
function applyScenario(db: MockDatabase, events: DomainEvent[], name: ScenarioName) {
  db.scenario = { name, requests: {} }
  if (name === 'session-expired') for (const session of db.sessions) { session.expiresAt = now(db) - 1; session.connection = null }
  if (name === 'price-changed') updateNft(db, events, 'nft-001', 'nft-001-ed-10', { priceEth: '1.49' })
  if (name === 'sold-out' || name === 'stock-conflict') updateNft(db, events, 'nft-001', 'nft-001-ed-10', { availableQuantity: 0 })
}
function metadata(db: MockDatabase) {
  return { scenario: db.scenario.name, now: new Date(now(db)).toISOString(), requests: db.scenario.requests, fixtures: { nfts: db.nfts.length, users: db.users.length } }
}

export const controlHandlers = [
  http.get(apiPath('/__mock/realtime'), ({ request }) => respond(() => HttpResponse.json(realtimeMetadata(identity(request).token)))),
  http.post(apiPath('/__mock/realtime'), ({ request }) => respond(async () => {
    const input = await jsonBody(request)
    if (input.action === 'disconnect') interruptRealtime(input.hold !== false)
    else if (input.action === 'resume') resumeRealtime()
    else if (input.action === 'replay') {
      const id = text(input.eventId, 'eventId')
      const copies = integer(input.copies ?? 1, 'copies', 1, 5)
      const delayMs = integer(input.delayMs ?? 0, 'delayMs', 0, 5000)
      if (delayMs) await delay(delayMs)
      replayRealtime(id, copies, identity(request).token)
    } else invalid('action', 'Use disconnect, resume ou replay.')
    return HttpResponse.json(realtimeMetadata(identity(request).token))
  })),
  http.post(apiPath('/__mock/reset'), ({ request }) => respond(async () => {
    const input = await jsonBody(request)
    const db = createFixtures()
    applyScenario(db, [], scenarioName(input.scenario ?? 'default'))
    clearOrderTimers()
    resetRealtime()
    await replaceDatabase(db)
    return HttpResponse.json(metadata(db))
  })),
  http.get(apiPath('/__mock/status'), () => respond(async () => HttpResponse.json(await transaction(metadata)))),
  http.put(apiPath('/__mock/scenario'), ({ request }) => respond(async () => {
    const selected = scenarioName((await jsonBody(request)).scenario)
    return HttpResponse.json(await transaction((db, events) => { applyScenario(db, events, selected); return metadata(db) }))
  })),
  http.post(apiPath('/__mock/clock'), ({ request }) => respond(async () => {
    const advanceMs = integer((await jsonBody(request)).advanceMs, 'advanceMs', 0, 365 * 24 * 60 * 60_000)
    return HttpResponse.json(await transaction((db, events) => {
      db.clockOffsetMs += advanceMs
      for (const order of Object.values(db.orders)) settleIfDue(db, events, order)
      return metadata(db)
    }))
  })),
  http.patch(apiPath('/__mock/nfts/:id'), ({ request, params }) => respond(async () => {
    const input = await jsonBody(request)
    const editionId = text(input.editionId, 'editionId')
    const changes: { priceEth?: string; availableQuantity?: number } = {}
    if (input.priceEth !== undefined) changes.priceEth = eth(input.priceEth, 'priceEth')
    if (input.availableQuantity !== undefined) changes.availableQuantity = integer(input.availableQuantity, 'availableQuantity', 0, 1_000_000)
    return HttpResponse.json(await transaction((db, events) => updateNft(db, events, String(params.id), editionId, changes)))
  })),
  http.post(apiPath('/__mock/orders/:id/settle'), ({ request, params }) => respond(async () => {
    const { status } = await jsonBody(request)
    if (status !== 'confirmed' && status !== 'declined') invalid('status', 'Use confirmed ou declined.')
    return HttpResponse.json(await transaction((db, events) => settleOrder(db, events, String(params.id), status)))
  })),
]
