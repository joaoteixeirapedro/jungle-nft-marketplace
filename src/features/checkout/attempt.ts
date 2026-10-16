import type { CollectorDetails, CreateOrderRequest, Network } from '../../types/marketplace.ts'

export interface PurchaseAttempt { key: string; payload: CreateOrderRequest; orderId?: string }
export interface CheckoutDraft { walletId: string; network: Network; collector: CollectorDetails }
const attemptKey = (userId: string) => `jungle-marketplace.checkout.attempt.${userId}`
const draftKey = (userId: string) => `jungle-marketplace.checkout.draft.${userId}`
export function readAttempt(userId: string): PurchaseAttempt | null {
  const raw = sessionStorage.getItem(attemptKey(userId))
  if (!raw) return null
  const value = JSON.parse(raw) as Partial<PurchaseAttempt>
  if (typeof value.key !== 'string' || !value.key || !value.payload || typeof value.payload.quoteId !== 'string' || typeof value.payload.walletId !== 'string' || !value.payload.collector || !['ethereum', 'polygon', 'solana'].includes(value.payload.network) || (value.orderId !== undefined && typeof value.orderId !== 'string')) throw new Error('A referência da tentativa está inválida. Não envie outra compra; consulte seus pedidos.')
  return value as PurchaseAttempt
}
export function writeAttempt(userId: string, attempt: PurchaseAttempt) { sessionStorage.setItem(attemptKey(userId), JSON.stringify(attempt)) }
export function finishAttempt(userId: string, orderId: string) {
  if (readAttempt(userId)?.orderId === orderId) { sessionStorage.removeItem(attemptKey(userId)); sessionStorage.removeItem(draftKey(userId)) }
}
export function discardRejectedAttempt(userId: string, key: string) {
  if (readAttempt(userId)?.key === key) sessionStorage.removeItem(attemptKey(userId))
}
export function readDraft(userId: string): CheckoutDraft | null {
  const raw = sessionStorage.getItem(draftKey(userId))
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<CheckoutDraft>
    return typeof value.walletId === 'string' && value.collector && typeof value.collector.displayName === 'string' && ['ethereum', 'polygon', 'solana'].includes(value.network ?? '') ? value as CheckoutDraft : null
  } catch { return null }
}
export function writeDraft(userId: string, value: CheckoutDraft) { sessionStorage.setItem(draftKey(userId), JSON.stringify(value)) }
export function validateCollector(collector: CollectorDetails) {
  const errors: Record<string, string> = {}
  for (const [key, max] of [['displayName', 80], ['username', 32], ['profileName', 80]] as const) if (!collector[key]?.trim() || collector[key].trim().length > max) errors[key] = `Preencha este campo com até ${max} caracteres.`
  if (!collector.email?.trim() || collector.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collector.email.trim())) errors.email = 'Informe um e-mail válido.'
  for (const [key, max] of [['ens', 255], ['referralCode', 80], ['secondaryAddress', 80], ['notes', 2000]] as const) if ((collector[key]?.length ?? 0) > max) errors[key] = `Use até ${max} caracteres.`
  return errors
}
export function collectorPayload(collector: CollectorDetails): CollectorDetails {
  const result: CollectorDetails = { displayName: collector.displayName.trim(), username: collector.username.trim(), profileName: collector.profileName.trim(), email: collector.email.trim() }
  for (const key of ['ens', 'referralCode', 'secondaryAddress', 'notes'] as const) if (collector[key]?.trim()) result[key] = collector[key]!.trim()
  return result
}
