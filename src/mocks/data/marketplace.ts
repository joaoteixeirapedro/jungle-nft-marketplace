import { formatEth } from '../../lib/eth.ts'
import { nftArtwork } from './artwork.ts'
import type { Wallet } from '../../types/marketplace.ts'
import type { MockDatabase, StoredUser } from '../state/model.ts'

export function createFixtures(): MockDatabase {
  const creators = [
    { id: 'creator-lia', name: 'Lia Campos', bio: 'Personagens digitais e coleções de arte generativa.' },
    { id: 'creator-caio', name: 'Caio Nunes', bio: 'Fotografia, música e mundos tridimensionais.' },
    { id: 'creator-nina', name: 'Nina Sol', bio: 'Colecionáveis e personagens de jogos independentes.' },
  ]
  const collections = creators.map((creator, index) => ({ id: `collection-${index + 1}`, name: ['Kurio Apes', 'Digital Horizons', 'Arcade Origins'][index]!, creatorId: creator.id, description: `Coleção fictícia de ${creator.name}, criada para a demonstração.` }))
  const names = ['Emerald Ape #042', 'Sage Nomad #009', 'Neon Vessel #552', 'Cosmic Bloom #118', 'Violet Nomad #314', 'Ivory Baron #088', 'Golden Beat #207', 'Golden Signal #160']
  const categories = ['art', 'photography', 'music', '3d', 'collectibles', 'generative', 'gaming'] as const
  const networks = ['ethereum', 'polygon', 'solana'] as const
  const users: StoredUser[] = [
    { profile: { id: 'user-alice', username: 'alice', email: 'alice@example.test', displayName: 'Alice Colecionadora', ens: 'alice.kurio.eth', walletAlias: 'Principal Alice', avatarUrl: null, version: 1 }, password: { salt: 'jungle-demo-alice-v1', hash: 'b0ad42a27e4a8d9d5e526b5088fd2859d7efd56930126b4c7892eecc553a7169', iterations: 100_000 }, credentialVersion: 1 },
    { profile: { id: 'user-bruno', username: 'bruno', email: 'bruno@example.test', displayName: 'Bruno Colecionador', ens: null, walletAlias: 'Principal Bruno', avatarUrl: null, version: 1 }, password: { salt: 'jungle-demo-bruno-v1', hash: 'd79a06a5980f663a7cbd46dc0e32270b0f25f56f57fa676787d7d63eaf9b244d', iterations: 100_000 }, credentialVersion: 1 },
  ]
  const wallet = (user: StoredUser, role: Wallet['role'], index: number): Wallet => ({
    id: `wallet-${user.profile.username}-${role}`, role, displayName: role === 'primary' ? 'Principal' : 'Reserva', alias: `${role} ${user.profile.username}`,
    profileName: user.profile.username, email: user.profile.email, ens: null, referralCode: 'DEMO', secondaryAddress: null,
    network: role === 'primary' ? 'ethereum' : 'polygon', type: 'metamask', address: `0x${String(index).repeat(40)}`, version: 1,
  })
  const db: MockDatabase = {
    schemaVersion: 1, sequence: 0, clockOffsetMs: 0, scenario: { name: 'default', requests: {} }, creators, collections,
    nfts: Array.from({ length: 30 }, (_, index) => {
      const id = `nft-${String(index + 1).padStart(3, '0')}`
      const collection = collections[index % collections.length]!
      const priceEth = formatEth(BigInt(119 + index * 17) * 10n ** 16n)
      return {
        id, name: names[index] ?? `${collection.name} #${String(index + 1).padStart(3, '0')}`, description: `Arte digital fictícia da coleção ${collection.name}. Edições verificáveis apenas na simulação.`,
        category: categories[index % categories.length]!, network: networks[index % networks.length]!, collectionId: collection.id, creatorId: collection.creatorId,
        image: nftArtwork(index), attributes: { rarity: index % 5 === 0 ? 'rare' : 'standard', series: collection.name },
        createdAt: new Date(Date.UTC(2026, 6, 30 - index)).toISOString(), version: 1,
        editions: [
          { id: `${id}-ed-1`, label: '1/1', supply: 1, sold: index % 4 === 3 ? 1 : 0, reserved: 0, priceEth: formatEth(BigInt(238 + index * 34) * 10n ** 16n) },
          { id: `${id}-ed-10`, label: '1/10', supply: 10, sold: index % 8 === 7 ? 10 : 2, reserved: 0, priceEth },
          { id: `${id}-ed-50`, label: '1/50', supply: 50, sold: index % 8 === 7 ? 50 : index, reserved: 0, priceEth },
        ],
      }
    }),
    users, sessions: [{ token: 'expired-demo-session', userId: 'user-alice', expiresAt: Date.parse('2020-01-01T00:00:00.000Z'), connection: null }], favorites: { 'user-alice': ['nft-001', 'nft-004'], 'user-bruno': ['nft-002'] },
    carts: {
      'user:user-alice': { id: 'cart-alice', version: 1, items: [{ nftId: 'nft-002', editionId: 'nft-002-ed-10', quantity: 1 }], couponCode: null },
      'user:user-bruno': { id: 'cart-bruno', version: 1, items: [{ nftId: 'nft-003', editionId: 'nft-003-ed-10', quantity: 1 }], couponCode: null },
    },
    wallets: { 'user-alice': [wallet(users[0]!, 'primary', 1), wallet(users[0]!, 'secondary', 2)], 'user-bruno': [wallet(users[1]!, 'primary', 3)] },
    quotes: {}, orders: {}, idempotency: {}, networkFees: { ethereum: '0.016', polygon: '0.002', solana: '0.001' },
    coupons: [{ code: 'WELCOME10', discountBps: 1000, expiresAt: '2030-01-01T00:00:00.000Z' }, { code: 'EXPIRED', discountBps: 1000, expiresAt: '2020-01-01T00:00:00.000Z' }],
  }
  const historicLine = { id: 'nft-001:nft-001-ed-10', nftId: 'nft-001', editionId: 'nft-001-ed-10', quantity: 1, nftName: db.nfts[0]!.name, editionLabel: '1/10', unitPriceEth: '1.19', lineTotalEth: '1.19', availableQuantity: 8, nftVersion: 1 }
  const totals = { subtotalEth: '1.19', discountEth: '0.0', networkFeeEth: '0.016', totalEth: '1.206' }
  const collector = { displayName: users[0]!.profile.displayName, username: 'alice', email: 'alice@example.test', profileName: 'alice' }
  const historicWallet = structuredClone(db.wallets['user-alice']![0]!)
  db.orders['order-demo-alice'] = { userId: 'user-alice', settlement: null, settleAt: null, order: {
    id: 'order-demo-alice', status: 'confirmed', version: 1, createdAt: '2026-07-29T12:00:00.000Z', items: [historicLine], network: 'ethereum', wallet: historicWallet, collector, couponCode: null, ...totals, declineReason: null,
    receipt: { orderId: 'order-demo-alice', transactionId: 'simulated-tx-demo-alice', simulated: true, confirmedAt: '2026-07-29T12:00:01.000Z', items: [structuredClone(historicLine)], network: 'ethereum', wallet: structuredClone(historicWallet), collector: structuredClone(collector), couponCode: null, ...totals },
  } }
  return db
}
