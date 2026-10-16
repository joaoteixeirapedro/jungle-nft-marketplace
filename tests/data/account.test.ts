import assert from 'node:assert/strict'
import test from 'node:test'
import { createFixtures } from '../../src/mocks/data/marketplace.ts'
import { updateAvatar, updateProfile } from '../../src/mocks/domain/accounts.ts'
import { saveWallet } from '../../src/mocks/domain/wallets.ts'
import { MockError } from '../../src/mocks/errors.ts'

test('account edits preserve ownership, connection policy and the immutable receipt', () => {
  const db = createFixtures()
  db.sessions.push({ token: 'account-alice', userId: 'user-alice', expiresAt: Date.now() + 60_000, connection: { walletId: 'wallet-alice-primary', network: 'ethereum', connected: true } }, { token: 'account-bruno', userId: 'user-bruno', expiresAt: Date.now() + 60_000, connection: null })
  const receipt = structuredClone(db.orders['order-demo-alice']!.order.receipt)
  const previousBruno = structuredClone(db.users.find((user) => user.profile.id === 'user-bruno')!.profile)
  const updated = updateProfile(db, 'account-alice', { displayName: 'Nome posterior' })
  assert.equal(updated.version, 2)
  assert.throws(() => updateAvatar(db, 'account-alice', { dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' }), (error) => error instanceof MockError && error.status === 422)
  const wallet = saveWallet(db, 'account-alice', { alias: 'Carteira revisada', network: 'polygon' }, 'wallet-alice-primary')
  assert.equal(wallet.version, 2)
  assert.equal(db.sessions[0]!.connection, null)
  assert.throws(() => saveWallet(db, 'account-bruno', { alias: 'Intruso' }, wallet.id), (error) => error instanceof MockError && error.status === 404)
  assert.deepEqual(db.orders['order-demo-alice']!.order.receipt, receipt)
  assert.deepEqual(db.users.find((user) => user.profile.id === 'user-bruno')!.profile, previousBruno)
})
