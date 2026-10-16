import type { Network, Wallet, WalletInput, WalletType } from '../../types/marketplace.ts'
import { email, invalid, MockError, record, text } from '../errors.ts'
import type { MockDatabase } from '../state/model.ts'
import { nextId } from '../state/store.ts'
import { requireSession, requireUser } from './session.ts'

export function network(value: unknown): Network {
  if (value !== 'ethereum' && value !== 'polygon' && value !== 'solana') invalid('network', 'Selecione ethereum, polygon ou solana.')
  return value
}
function walletInput(body: unknown): WalletInput {
  const input = record(body)
  const selectedNetwork = network(input.network)
  if (input.role !== 'primary' && input.role !== 'secondary') invalid('role', 'Selecione primary ou secondary.')
  if (!['metamask', 'walletconnect', 'coinbase'].includes(String(input.type))) invalid('type', 'Tipo de carteira inválido.')
  const address = text(input.address, 'address', 80)
  if (selectedNetwork === 'solana' ? !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) : !/^0x[a-fA-F0-9]{40}$/.test(address)) invalid('address', 'Formato de endereço incompatível com a rede selecionada.')
  return {
    role: input.role, displayName: text(input.displayName, 'displayName', 80), alias: text(input.alias, 'alias', 80), profileName: text(input.profileName, 'profileName', 80),
    email: email(input.email), ens: input.ens === undefined || input.ens === null ? null : text(input.ens, 'ens', 255), referralCode: text(input.referralCode, 'referralCode', 80),
    secondaryAddress: input.secondaryAddress === undefined || input.secondaryAddress === null ? null : text(input.secondaryAddress, 'secondaryAddress', 80),
    network: selectedNetwork, type: input.type as WalletType, address,
  }
}
export function saveWallet(db: MockDatabase, token: string | null, body: unknown, id?: string) {
  const user = requireUser(db, token)
  const wallets = db.wallets[user.profile.id] ?? (db.wallets[user.profile.id] = [])
  const current = id ? wallets.find((wallet) => wallet.id === id) : undefined
  if (id && !current) throw new MockError(404, 'WALLET_NOT_FOUND', 'Carteira não encontrada para este usuário.')
  const input = walletInput(current ? { ...current, ...record(body) } : body)
  if (wallets.some((wallet) => wallet.id !== id && wallet.role === input.role)) throw new MockError(409, 'WALLET_ROLE_CONFLICT', 'Já existe uma carteira com essa função.', { role: 'Edite a carteira existente.' })
  const comparableAddress = (address: string) => input.network === 'solana' ? address : address.toLowerCase()
  if (wallets.some((wallet) => wallet.id !== id && wallet.network === input.network && comparableAddress(wallet.address) === comparableAddress(input.address))) throw new MockError(409, 'WALLET_CONFLICT', 'Esta carteira já está cadastrada.')
  if (current) {
    Object.assign(current, input, { version: current.version + 1 })
    for (const session of db.sessions) if (session.connection?.walletId === current.id) session.connection = null
    return current
  }
  const created: Wallet = { ...input, id: nextId(db, 'wallet'), version: 1 }
  wallets.push(created)
  return created
}
export function findWallet(db: MockDatabase, userId: string, id: string) {
  const wallet = db.wallets[userId]?.find((item) => item.id === id)
  if (!wallet) throw new MockError(404, 'WALLET_NOT_FOUND', 'Carteira não encontrada para este usuário.')
  return wallet
}
export function connectWallet(db: MockDatabase, token: string | null, id: string, selectedNetwork: Network) {
  const session = requireSession(db, token)
  const wallet = findWallet(db, session.userId, id)
  if (wallet.network !== selectedNetwork) throw new MockError(422, 'NETWORK_MISMATCH', 'A rede deve corresponder à carteira cadastrada.')
  if (db.scenario.name === 'wallet-refused') throw new MockError(409, 'WALLET_CONNECTION_REFUSED', 'Conexão recusada na simulação.')
  session.connection = { walletId: id, network: selectedNetwork, connected: true }
  return session.connection
}
