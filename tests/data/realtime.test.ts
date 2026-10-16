import assert from 'node:assert/strict'
import test from 'node:test'
import { EventVersions, newerOrder, newerResource, shareCatalog, shareNft } from '../../src/lib/resource-versions.ts'
import { createFixtures } from '../../src/mocks/data/marketplace.ts'
import { nftDetail } from '../../src/mocks/domain/catalog.ts'

test('event identity and resource versions reject duplicates, old messages and equal-version replays', () => {
  const versions = new EventVersions()
  const event = { id: 'event-10', resourceId: 'nft-001', version: 6 }
  assert.equal(versions.accept('nft', event, 4), true)
  assert.equal(versions.accept('nft', event), false)
  assert.equal(versions.accept('nft', { ...event, id: 'event-9', version: 5 }), false)
  assert.equal(versions.accept('nft', { ...event, id: 'event-11' }), false)
  assert.equal(versions.accept('nft', { ...event, id: 'event-12', version: 7 }), true)
  assert.equal(versions.accept('nft', { ...event, id: 'event-13', version: 8 }, 9), false)
})
test('older REST snapshots and contradictory terminal order transitions are never applied', () => {
  const db = createFixtures()
  const nft = db.nfts[0]!
  assert.equal(newerResource({ ...nft, version: 6 }, { ...nft, version: 5 }).version, 6)
  const confirmed = db.orders['order-demo-alice']!.order
  assert.equal(confirmed.status, 'confirmed')
  assert.equal(newerOrder(confirmed, { ...confirmed, status: 'pending', version: confirmed.version + 1 }), confirmed)
  assert.equal(newerOrder({ ...confirmed, status: 'declined' }, { ...confirmed, status: 'pending' }).status, 'declined')
})

test('unchanged REST snapshots reuse references without hiding newer NFT data', () => {
  const nft = nftDetail(createFixtures(), 'nft-001')
  const catalog = { items: [nft], pagination: { page: 1, pageSize: 9, totalItems: 1, totalPages: 1 } }
  assert.equal(shareNft(nft, structuredClone(nft)), nft)
  assert.equal(shareCatalog(catalog, structuredClone(catalog)), catalog)
  const updated = { ...nft, version: nft.version + 1 }
  assert.equal(shareNft(nft, updated).version, updated.version)
  assert.equal(shareNft(updated, nft), updated)
})
