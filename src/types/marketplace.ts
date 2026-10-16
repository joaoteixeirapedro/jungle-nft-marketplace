/** JSON amounts in ETH: decimal strings, at most 18 fractional digits. */
export type Eth = string
export type Network = 'ethereum' | 'polygon' | 'solana'
export type Category = 'art' | 'photography' | 'music' | '3d' | 'collectibles' | 'generative' | 'gaming'
export type WalletType = 'metamask' | 'walletconnect' | 'coinbase'
export type OrderStatus = 'pending' | 'confirmed' | 'declined'

export interface Creator { id: string; name: string; bio: string }
export interface Collection { id: string; name: string; creatorId: string; description: string }
export interface NftEdition {
  id: string
  label: string
  supply: number
  availableQuantity: number
  priceEth: Eth
}
export interface Nft {
  id: string
  name: string
  description: string
  category: Category
  network: Network
  collectionId: string
  creatorId: string
  image: { src: string | null; alt: string }
  attributes: Record<string, string>
  createdAt: string
  version: number
  priceEth: Eth
  availableQuantity: number
  editions: NftEdition[]
}
export interface NftDetail extends Nft { creator: Creator; collection: Collection }
export interface CatalogParams {
  q?: string
  category?: Category[]
  network?: Network[]
  collectionId?: string
  creatorId?: string
  minPrice?: Eth
  maxPrice?: Eth
  available?: boolean
  sort?: 'recent' | 'price-asc' | 'price-desc' | 'name'
  page?: number
  pageSize?: number
}
export interface PageResult<T> {
  items: T[]
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}
export interface Profile {
  id: string
  username: string
  email: string
  displayName: string
  ens: string | null
  walletAlias: string
  avatarUrl: string | null
  version: number
}
export interface LoginRequest { email: string; password: string }
export interface RegisterRequest extends LoginRequest { username: string; confirmPassword: string }
export interface CartMergeResult {
  merged: boolean
  adjustments: { nftId: string; editionId: string; requestedQuantity: number; acceptedQuantity: number }[]
}
export interface SessionResponse { token: string; user: Profile; expiresAt: string; connection: WalletConnection | null; cartMerge?: CartMergeResult }
export type ProfileUpdate = Partial<Pick<Profile, 'username' | 'email' | 'displayName' | 'ens' | 'walletAlias'>>
export interface PasswordUpdate { currentPassword: string; newPassword: string; confirmPassword: string }
export interface AvatarUpdate { dataUrl: string | null }
export interface Wallet {
  id: string
  role: 'primary' | 'secondary'
  displayName: string
  alias: string
  profileName: string
  email: string
  ens: string | null
  referralCode: string
  secondaryAddress: string | null
  network: Network
  type: WalletType
  address: string
  version: number
}
export type WalletInput = Omit<Wallet, 'id' | 'version'>
export interface WalletConnection { walletId: string; network: Network; connected: boolean }
export interface CartLineInput { nftId: string; editionId: string; quantity: number }
export interface CartLine extends CartLineInput {
  id: string
  nftName: string
  editionLabel: string
  unitPriceEth: Eth
  lineTotalEth: Eth
  availableQuantity: number
  nftVersion: number
}
export interface ApiProblem {
  code: string
  message: string
  fieldErrors?: Record<string, string>
  details?: Record<string, unknown>
}
export interface Totals {
  subtotalEth: Eth
  discountEth: Eth
  networkFeeEth: Eth
  totalEth: Eth
}
export interface Cart {
  id: string
  version: number
  items: CartLine[]
  couponCode: string | null
  couponStatus: 'none' | 'valid' | 'invalid' | 'expired'
  totals: Totals
  issues: ApiProblem[]
}
export interface QuoteRequest { network?: Network; walletId?: string }
export interface Quote extends Totals {
  id: string
  cartVersion: number
  items: CartLine[]
  couponCode: string | null
  network: Network
  walletId: string | null
  expiresAt: string
}
export interface CollectorDetails {
  displayName: string
  username: string
  email: string
  profileName: string
  ens?: string | null
  referralCode?: string
  secondaryAddress?: string | null
  notes?: string
}
export interface CreateOrderRequest {
  quoteId: string
  walletId: string
  network: Network
  collector: CollectorDetails
}
export interface Receipt extends Totals {
  orderId: string
  transactionId: string
  simulated: true
  confirmedAt: string
  items: CartLine[]
  network: Network
  wallet: Wallet
  collector: CollectorDetails
  couponCode: string | null
}
export interface Order extends Totals {
  id: string
  status: OrderStatus
  version: number
  createdAt: string
  items: CartLine[]
  network: Network
  wallet: Wallet
  collector: CollectorDetails
  couponCode: string | null
  receipt: Receipt | null
  declineReason: string | null
}
export interface EventEnvelope<T> {
  id: string
  resourceId: string
  version: number
  occurredAt: string
  userId?: string
  data: T
}
export type NftUpdatedEvent = EventEnvelope<Nft>
export type OrderUpdatedEvent = EventEnvelope<Order>
