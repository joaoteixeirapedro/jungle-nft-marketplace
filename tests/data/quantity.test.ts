import test from 'node:test'
import assert from 'node:assert/strict'
import { clampQuantity, quantityLimit, validQuantity } from '../../src/lib/quantity.ts'

test('quantity validates integer input and clamps to API stock/line limits', () => {
  for (const input of ['0', '-1', '1.5', '1e1', '', ' ', 'NaN', '1000']) assert.equal(validQuantity(input, 999), false, input)
  assert.equal(validQuantity('8', 8), true)
  assert.equal(validQuantity('9', 8), false)
  assert.equal(quantityLimit(10000), 999)
  assert.equal(quantityLimit(0), 0)
  assert.equal(clampQuantity(50, 8), 8)
  assert.equal(clampQuantity(8, 1), 1)
  assert.equal(clampQuantity(1, 0), 1)
})
