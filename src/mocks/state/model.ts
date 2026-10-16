import type { CartLineInput, Collection, Creator, Network, Nft, Order, Profile, Quote, Wallet, WalletConnection } from '../../types/marketplace.ts'

export const scenarioNames = ['default', 'empty', 'slow', 'out-of-order', 'server-error', 'network-error', 'transient-error', 'session-expired', 'unauthorized', 'validation-error', 'coupon-invalid', 'coupon-expired', 'price-changed', 'sold-out', 'stock-conflict', 'order-timeout', 'payment-confirmed', 'payment-declined', 'payment-pending', 'wallet-refused', 'malformed-session'] as const
export type ScenarioName = typeof scenarioNames[number]
export interface StoredEdition { id: string; label: string; supply: number; sold: number; reserved: number; priceEth: string }
export interface StoredNft extends Omit<Nft, 'priceEth' | 'availableQuantity' | 'editions'> { editions: StoredEdition[] }
export interface PasswordVerifier { salt: string; hash: string; iterations: number }
export interface StoredUser { profile: Profile; password: PasswordVerifier; credentialVersion: number }
export interface StoredSession { token: string; userId: string; expiresAt: number; connection: WalletConnection | null }
export interface StoredCart { id: string; version: number; items: CartLineInput[]; couponCode: string | null }
export interface StoredQuote { owner: string; quote: Quote; fingerprint: string }
export interface StoredOrder { userId: string; order: Order; settlement: 'confirmed' | 'declined' | null; settleAt: number | null }
export interface IdempotencyRecord { fingerprint: string; orderId: string }
export interface MockDatabase {
  schemaVersion: 1
  sequence: number
  clockOffsetMs: number
  scenario: { name: ScenarioName; requests: Record<string, number> }
  creators: Creator[]
  collections: Collection[]
  nfts: StoredNft[]
  users: StoredUser[]
  sessions: StoredSession[]
  favorites: Record<string, string[]>
  carts: Record<string, StoredCart>
  wallets: Record<string, Wallet[]>
  quotes: Record<string, StoredQuote>
  orders: Record<string, StoredOrder>
  idempotency: Record<string, IdempotencyRecord>
  networkFees: Record<Network, string>
  coupons: { code: string; discountBps: number; expiresAt: string }[]
}
