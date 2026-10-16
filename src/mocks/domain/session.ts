import { MockError } from '../errors.ts'
import type { MockDatabase } from '../state/model.ts'
import { now } from '../state/store.ts'

export interface Identity { token: string | null; guestId: string | null }
export function requireSession(db: MockDatabase, token: string | null) {
  if (db.scenario.name === 'unauthorized' || !token) throw new MockError(401, 'AUTH_REQUIRED', 'Autenticação necessária.')
  const session = db.sessions.find((item) => item.token === token)
  if (!session) throw new MockError(401, 'INVALID_SESSION', 'Sessão inválida.')
  if (session.expiresAt <= now(db)) throw new MockError(401, 'SESSION_EXPIRED', 'A sessão expirou. Entre novamente para retomar o fluxo.')
  return session
}
export function requireUser(db: MockDatabase, token: string | null) {
  const session = requireSession(db, token)
  const user = db.users.find((item) => item.profile.id === session.userId)
  if (!user) throw new MockError(401, 'INVALID_SESSION', 'Conta da sessão não encontrada.')
  return user
}
export function cartOwner(db: MockDatabase, identity: Identity): string {
  if (identity.token) return `user:${requireSession(db, identity.token).userId}`
  if (!identity.guestId || !/^[\w-]{1,80}$/.test(identity.guestId)) throw new MockError(400, 'GUEST_ID_REQUIRED', 'Envie X-Guest-Id para identificar o carrinho visitante.')
  return `guest:${identity.guestId}`
}
