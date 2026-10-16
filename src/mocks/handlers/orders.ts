import { delay, http, HttpResponse } from 'msw'
import { MockError } from '../errors.ts'
import { apiPath, identity, jsonBody, respond } from '../http.ts'
import { createOrder, ownedOrder, parseOrder, settleIfDue } from '../domain/orders.ts'
import { requireSession } from '../domain/session.ts'
import { transaction } from '../state/store.ts'

export const orderHandlers = [
  http.post(apiPath('/orders'), ({ request }) => respond(async () => {
    const input = parseOrder(await jsonBody(request))
    const result = await transaction((db, events) => ({ ...createOrder(db, events, identity(request), input, request.headers.get('Idempotency-Key')), timeout: db.scenario.name === 'order-timeout' }))
    // Commit first. Only the first response is delayed beyond Axios's 10 s timeout.
    if (result.timeout && !result.replayed) await delay(15_000)
    return HttpResponse.json(result.order, { status: result.replayed ? 200 : 201, headers: { 'Idempotency-Replayed': String(result.replayed) } })
  }, request)),
  http.get(apiPath('/orders'), ({ request }) => respond(async () => HttpResponse.json(await transaction((db, events) => {
    const session = requireSession(db, identity(request).token)
    const orders = Object.values(db.orders).filter((stored) => stored.userId === session.userId)
    for (const order of orders) settleIfDue(db, events, order)
    return { items: orders.map((stored) => stored.order).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
  })), request)),
  http.get(apiPath('/orders/:id'), ({ request, params }) => respond(async () => HttpResponse.json(await transaction((db, events) => ownedOrder(db, events, identity(request).token, String(params.id)))), request)),
  http.get(apiPath('/orders/:id/receipt'), ({ request, params }) => respond(async () => HttpResponse.json(await transaction((db, events) => {
    const order = ownedOrder(db, events, identity(request).token, String(params.id))
    if (!order.receipt) throw new MockError(409, 'ORDER_NOT_CONFIRMED', 'Recibo disponível somente após confirmação do pedido.')
    return order.receipt
  })), request)),
]
