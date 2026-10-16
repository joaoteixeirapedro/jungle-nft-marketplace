import test from 'node:test'
import assert from 'node:assert/strict'
import { safeAuthRedirect, validateAuthFields } from '../../src/lib/auth-navigation.ts'

test('auth redirect permits internal context only and form rules match the API', () => {
  for (const input of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/register?redirect=/login', '/unknown', '/\nprofile']) assert.equal(safeAuthRedirect(input), '/', input)
  assert.equal(safeAuthRedirect('/checkout?quoteId=quote-1#review'), '/checkout?quoteId=quote-1#review')
  assert.equal(safeAuthRedirect('/profile?password=secret&tab=wallets'), '/profile?tab=wallets')
  assert.equal(safeAuthRedirect('/nfts/nft-001?returnTo=%2Fmarketplace%3Fpage%3D2'), '/nfts/nft-001?returnTo=%2Fmarketplace%3Fpage%3D2')
  assert.deepEqual(validateAuthFields({ username: 'novo_user', email: 'novo@example.test', password: 'Password123', confirmPassword: 'Password123' }, true), {})
  assert.ok(validateAuthFields({ email: 'invalido', password: 'short' }, true).password)
  assert.deepEqual(validateAuthFields({ email: 'alice@example.test', password: 'qualquer' }, false), {})
})
