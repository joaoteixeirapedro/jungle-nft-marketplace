import { http, HttpResponse } from 'msw'
import { apiPath, identity, jsonBody, respond } from '../http.ts'
import { changePassword, currentSession, login, register, updateAvatar, updateProfile } from '../domain/accounts.ts'
import { requireSession, requireUser } from '../domain/session.ts'
import { now, transaction } from '../state/store.ts'

export const accountHandlers = [
  http.post(apiPath('/accounts'), ({ request }) => respond(async () => HttpResponse.json(await register(await jsonBody(request), identity(request)), { status: 201 }), request)),
  http.post(apiPath('/session'), ({ request }) => respond(async () => HttpResponse.json(await login(await jsonBody(request), identity(request))), request)),
  http.get(apiPath('/session'), ({ request }) => respond(async () => HttpResponse.json(await transaction((db) => currentSession(db, identity(request).token))), request)),
  http.delete(apiPath('/session'), ({ request }) => respond(async () => {
    const { token } = identity(request)
    await transaction((db) => { db.sessions = db.sessions.filter((session) => session.token !== token) })
    return new HttpResponse(null, { status: 204 })
  }, request)),
  http.post(apiPath('/session/expire'), ({ request }) => respond(async () => {
    await transaction((db) => { const session = requireSession(db, identity(request).token); session.expiresAt = now(db) - 1; session.connection = null })
    return new HttpResponse(null, { status: 204 })
  }, request)),
  http.get(apiPath('/profile'), ({ request }) => respond(async () => HttpResponse.json(await transaction((db) => requireUser(db, identity(request).token).profile)), request)),
  http.patch(apiPath('/profile'), ({ request }) => respond(async () => {
    const body = await jsonBody(request)
    return HttpResponse.json(await transaction((db) => updateProfile(db, identity(request).token, body)))
  }, request)),
  http.patch(apiPath('/profile/avatar'), ({ request }) => respond(async () => {
    const body = await jsonBody(request)
    return HttpResponse.json(await transaction((db) => updateAvatar(db, identity(request).token, body)))
  }, request)),
  http.post(apiPath('/profile/password'), ({ request }) => respond(async () => HttpResponse.json(await changePassword(identity(request).token, await jsonBody(request))), request)),
]
