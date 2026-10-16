const SESSION_KEY = 'jungle-marketplace.session'
const GUEST_KEY = 'jungle-marketplace.guest'
const listeners = new Set<() => void>()
export type SessionIssue = 'expired' | 'invalid' | 'logout' | 'logout-failed' | null
let issue: SessionIssue = null
export const getSessionIssue = () => issue
export function clearSessionIssue() { issue = null; listeners.forEach((listener) => listener()) }

export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => { if (event.key === SESSION_KEY || event.key === null) listener() }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage) }
}

export function getSessionToken() { return sessionStorage.getItem(SESSION_KEY) }
export function setSessionToken(token: string | null, reason: SessionIssue = null) {
  issue = reason
  if (token) sessionStorage.setItem(SESSION_KEY, token)
  else sessionStorage.removeItem(SESSION_KEY)
  listeners.forEach((listener) => listener())
}
export function invalidateSession(expectedToken: string, reason: SessionIssue = 'expired') {
  if (getSessionToken() === expectedToken) setSessionToken(null, reason)
}
export function getGuestId() {
  let id = sessionStorage.getItem(GUEST_KEY)
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(GUEST_KEY, id) }
  return id
}
