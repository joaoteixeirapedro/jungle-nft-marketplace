import assert from 'node:assert/strict'
import test from 'node:test'
import { collectorPayload, validateCollector } from '../../src/features/checkout/attempt.ts'

test('collector fields use existing domain limits and optional empty values are omitted', () => {
  const input = { displayName: ' Alice ', username: 'alice', profileName: 'colecionadora', email: 'alice@example.test', ens: '', referralCode: '', secondaryAddress: '', notes: ' Nota ' }
  assert.deepEqual(validateCollector(input), {})
  assert.deepEqual(collectorPayload(input), { displayName: 'Alice', username: 'alice', profileName: 'colecionadora', email: 'alice@example.test', notes: 'Nota' })
  assert.ok(validateCollector({ ...input, username: '', email: 'invalid', notes: 'x'.repeat(2001) }).username)
  assert.ok(validateCollector({ ...input, email: 'invalid' }).email)
  assert.ok(validateCollector({ ...input, displayName: 'x'.repeat(81) }).displayName)
})
