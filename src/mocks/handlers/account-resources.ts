import { http, HttpResponse } from 'msw'
import { MockError } from '../errors.ts'
import { apiPath, identity, jsonBody, respond } from '../http.ts'
import { findNft, nftView } from '../domain/catalog.ts'
import { requireSession, requireUser } from '../domain/session.ts'
import { connectWallet, findWallet, network, saveWallet } from '../domain/wallets.ts'
import { transaction } from '../state/store.ts'

export const accountResourceHandlers = [
  http.get(apiPath('/favorites'), ({ request }) => respond(async () => HttpResponse.json(await transaction((db) => {
    const user = requireUser(db, identity(request).token)
    return { items: (db.favorites[user.profile.id] ?? []).map((id) => nftView(findNft(db, id))) }
  })), request)),
  ...(['put', 'delete'] as const).map((method) => http[method](apiPath('/favorites/:id'), ({ request, params }) => respond(async () => HttpResponse.json(await transaction((db) => {
    const user = requireUser(db, identity(request).token)
    const id = String(params.id)
    findNft(db, id)
    const items = new Set(db.favorites[user.profile.id] ?? [])
    if (method === 'put') items.add(id)
    else items.delete(id)
    db.favorites[user.profile.id] = [...items]
    return { items: [...items].map((nftId) => nftView(findNft(db, nftId))) }
  })), request))),
  http.get(apiPath('/wallets'), ({ request }) => respond(async () => HttpResponse.json(await transaction((db) => ({ items: db.wallets[requireUser(db, identity(request).token).profile.id] ?? [] }))), request)),
  http.post(apiPath('/wallets'), ({ request }) => respond(async () => {
    const body = await jsonBody(request)
    return HttpResponse.json(await transaction((db) => saveWallet(db, identity(request).token, body)), { status: 201 })
  }, request)),
  http.patch(apiPath('/wallets/:id'), ({ request, params }) => respond(async () => {
    const body = await jsonBody(request)
    return HttpResponse.json(await transaction((db) => saveWallet(db, identity(request).token, body, String(params.id))))
  }, request)),
  http.post(apiPath('/wallets/:id/connection'), ({ request, params }) => respond(async () => {
    const selectedNetwork = network((await jsonBody(request)).network)
    return HttpResponse.json(await transaction((db) => connectWallet(db, identity(request).token, String(params.id), selectedNetwork)))
  }, request)),
  http.delete(apiPath('/wallets/:id/connection'), ({ request, params }) => respond(async () => {
    await transaction((db) => {
      const session = requireSession(db, identity(request).token)
      findWallet(db, session.userId, String(params.id))
      if (session.connection && session.connection.walletId !== params.id) throw new MockError(409, 'WALLET_CONNECTION_CONFLICT', 'Outra carteira está conectada.')
      session.connection = null
    })
    return new HttpResponse(null, { status: 204 })
  }, request)),
]
