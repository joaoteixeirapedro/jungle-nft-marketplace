import { http, HttpResponse } from 'msw'
import type { QuoteRequest } from '../../types/marketplace.ts'
import { integer, text } from '../errors.ts'
import { apiPath, identity, jsonBody, respond } from '../http.ts'
import { addCartItem, cartView, changeCartItem, createQuote, parseLine, setCoupon, storedCart } from '../domain/cart.ts'
import { cartOwner } from '../domain/session.ts'
import { network } from '../domain/wallets.ts'
import { transaction } from '../state/store.ts'

export const cartHandlers = [
  http.get(apiPath('/cart'), ({ request }) => respond(async () => HttpResponse.json(await transaction((db) => cartView(db, storedCart(db, cartOwner(db, identity(request)))))), request)),
  http.delete(apiPath('/cart'), ({ request }) => respond(async () => HttpResponse.json(await transaction((db) => {
    const cart = storedCart(db, cartOwner(db, identity(request)))
    cart.items = []; cart.couponCode = null; cart.version++
    return cartView(db, cart)
  })), request)),
  http.post(apiPath('/cart/items'), ({ request }) => respond(async () => {
    const input = parseLine(await jsonBody(request))
    return HttpResponse.json(await transaction((db) => addCartItem(db, identity(request), input)), { status: 201 })
  }, request)),
  http.patch(apiPath('/cart/items/:id'), ({ request, params }) => respond(async () => {
    const quantity = integer((await jsonBody(request)).quantity, 'quantity')
    return HttpResponse.json(await transaction((db) => changeCartItem(db, identity(request), String(params.id), quantity)))
  }, request)),
  http.delete(apiPath('/cart/items/:id'), ({ request, params }) => respond(async () => HttpResponse.json(await transaction((db) => changeCartItem(db, identity(request), String(params.id), null))), request)),
  http.put(apiPath('/cart/coupon'), ({ request }) => respond(async () => {
    const code = text((await jsonBody(request)).code, 'code', 40)
    return HttpResponse.json(await transaction((db) => setCoupon(db, identity(request), code)))
  }, request)),
  http.delete(apiPath('/cart/coupon'), ({ request }) => respond(async () => HttpResponse.json(await transaction((db) => setCoupon(db, identity(request), null))), request)),
  http.post(apiPath('/quotes'), ({ request }) => respond(async () => {
    const input = await jsonBody(request)
    const context: QuoteRequest = {}
    if (input.network !== undefined) context.network = network(input.network)
    if (input.walletId !== undefined) context.walletId = text(input.walletId, 'walletId')
    return HttpResponse.json(await transaction((db) => createQuote(db, identity(request), context)), { status: 201 })
  }, request)),
]
