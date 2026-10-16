import type { Profile, ProfileUpdate, SessionResponse } from '../../types/marketplace.ts'
import { email, invalid, MockError, record, text } from '../errors.ts'
import type { MockDatabase, StoredUser } from '../state/model.ts'
import { nextId, now, transaction } from '../state/store.ts'
import { mergeGuestCart } from './cart.ts'
import { derivePassword, validatePassword } from './passwords.ts'
import { type Identity, requireSession, requireUser } from './session.ts'

export function username(value: unknown) {
  const result = text(value, 'username', 32).toLowerCase()
  if (!/^[a-z0-9_]{3,32}$/.test(result)) invalid('username', 'Use de 3 a 32 letras, números ou sublinhado.')
  return result
}
function assertUnique(db: MockDatabase, input: Pick<Profile, 'email' | 'username'>, exceptId?: string) {
  if (db.users.some((user) => user.profile.id !== exceptId && user.profile.email === input.email)) throw new MockError(409, 'ACCOUNT_CONFLICT', 'E-mail já cadastrado.', { email: 'Escolha outro e-mail.' })
  if (db.users.some((user) => user.profile.id !== exceptId && user.profile.username === input.username)) throw new MockError(409, 'ACCOUNT_CONFLICT', 'Nome de usuário já cadastrado.', { username: 'Escolha outro nome.' })
}
function newSession(db: MockDatabase, user: StoredUser, identity: Identity): SessionResponse {
  db.sessions = db.sessions.filter((session) => session.token !== identity.token)
  const session = { token: crypto.randomUUID(), userId: user.profile.id, expiresAt: now(db) + 30 * 60_000, connection: null }
  db.sessions.push(session)
  const cartMerge = mergeGuestCart(db, identity.guestId, user.profile.id)
  return { token: session.token, user: user.profile, expiresAt: new Date(session.expiresAt).toISOString(), connection: null, cartMerge }
}
export async function register(body: unknown, identity: Identity) {
  const input = record(body)
  const account = { username: username(input.username), email: email(input.email) }
  const password = validatePassword(input.password)
  if (input.confirmPassword !== password) invalid('confirmPassword', 'As senhas devem ser iguais.')
  const verifier = await derivePassword(password, crypto.randomUUID())
  return transaction((db) => {
    assertUnique(db, account)
    const id = nextId(db, 'user')
    const user: StoredUser = { profile: { id, ...account, displayName: account.username, ens: null, walletAlias: '', avatarUrl: null, version: 1 }, password: verifier, credentialVersion: 1 }
    db.users.push(user)
    db.favorites[id] = []
    db.wallets[id] = []
    return newSession(db, user, identity)
  })
}
export async function login(body: unknown, identity: Identity) {
  const input = record(body)
  const address = email(input.email)
  if (typeof input.password !== 'string' || !input.password || input.password.length > 128) invalid('password', 'Informe a senha.')
  const user = await transaction((db) => db.users.find((item) => item.profile.email === address))
  if (!user) throw new MockError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
  const verifier = await derivePassword(input.password, user.password.salt, user.password.iterations)
  return transaction((db) => {
    const current = db.users.find((item) => item.profile.id === user.profile.id)!
    if (current.password.hash !== verifier.hash || current.credentialVersion !== user.credentialVersion) throw new MockError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    return newSession(db, current, identity)
  })
}
export function currentSession(db: MockDatabase, token: string | null): SessionResponse {
  const session = requireSession(db, token)
  return { token: session.token, expiresAt: new Date(session.expiresAt).toISOString(), user: requireUser(db, token).profile, connection: session.connection }
}
export function updateProfile(db: MockDatabase, token: string | null, body: unknown) {
  const user = requireUser(db, token)
  const input = record(body)
  const changes: ProfileUpdate = {}
  if ('username' in input) changes.username = username(input.username)
  if ('email' in input) changes.email = email(input.email)
  if ('displayName' in input) changes.displayName = text(input.displayName, 'displayName', 80)
  if ('walletAlias' in input) changes.walletAlias = text(input.walletAlias, 'walletAlias', 80)
  if ('ens' in input) changes.ens = input.ens === null ? null : text(input.ens, 'ens', 255)
  if (!Object.keys(changes).length) invalid('profile', 'Informe ao menos um campo de perfil.')
  const profile = { ...user.profile, ...changes, version: user.profile.version + 1 }
  assertUnique(db, profile, profile.id)
  user.profile = profile
  return profile
}
export function updateAvatar(db: MockDatabase, token: string | null, body: unknown) {
  const user = requireUser(db, token)
  const { dataUrl } = record(body)
  if (dataUrl !== null) {
    if (typeof dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)) invalid('dataUrl', 'Use uma imagem PNG, JPEG ou WebP em base64.')
    try { if (atob(dataUrl.slice(dataUrl.indexOf(',') + 1)).length > 1_048_576) invalid('dataUrl', 'Limite de imagem: 1 MiB.') } catch (error) {
      if (error instanceof MockError) throw error
      invalid('dataUrl', 'Imagem base64 inválida.')
    }
  }
  user.profile.avatarUrl = dataUrl as string | null
  user.profile.version++
  return user.profile
}
export async function changePassword(token: string | null, body: unknown) {
  const input = record(body)
  const user = await transaction((db) => requireUser(db, token))
  if (typeof input.currentPassword !== 'string') invalid('currentPassword', 'Informe a senha atual.')
  const next = validatePassword(input.newPassword, 'newPassword')
  if (input.confirmPassword !== next) invalid('confirmPassword', 'As senhas devem ser iguais.')
  const current = await derivePassword(input.currentPassword, user.password.salt, user.password.iterations)
  if (current.hash !== user.password.hash) throw new MockError(422, 'INVALID_PASSWORD', 'Senha atual incorreta.', { currentPassword: 'Senha incorreta.' })
  const replacement = await derivePassword(next, crypto.randomUUID())
  return transaction((db) => {
    const fresh = requireUser(db, token)
    if (fresh.credentialVersion !== user.credentialVersion) throw new MockError(409, 'PASSWORD_CONFLICT', 'A senha foi alterada em outra operação. Tente novamente.')
    fresh.password = replacement
    fresh.credentialVersion++
    db.sessions = db.sessions.filter((session) => session.userId !== fresh.profile.id || session.token === token)
    return { status: 'ok' as const }
  })
}
