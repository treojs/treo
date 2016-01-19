import { expect } from 'chai'
import { del } from 'idb-factory'
import map from 'lodash.map'
import schema from './support/schema'
import treo from '../src'

describe('Index', () => {
  let db
  let results = {}

  function iterator(index) {
    results[index] = []
    return (cursor) => {
      results[index].push(cursor.value)
      cursor.continue()
    }
  }

  beforeEach(async () => {
    db = await treo('treo.index', schema.version(), schema.callback())
    results = {}

    await [
      db.magazines.put({ name: 'M1', frequency: 12, keywords: ['political'] }),
      db.magazines.put({ name: 'M2', frequency: 6, keywords: ['gaming'] }),
      db.magazines.put({ name: 'M3', frequency: 52, keywords: ['political', 'news'] }),
      db.magazines.put({ name: 'M4', frequency: 24, keywords: ['gadgets', 'gaming', 'computers'] }),
      db.magazines.put({ name: 'M5', frequency: 52, keywords: ['computers', 'gaming'] }),
    ]
  })

  before(() => del('treo.index'))
  afterEach(() => db.del())

  it('has properties', () => {
    const byTitle = db.store('books').index('byTitle')
    expect(byTitle.name).equal('byTitle')
    expect(byTitle.key).equal('title')
    expect(byTitle.unique).equal(true)
    expect(byTitle.multi).equal(false)
  })

  it('#get', async () => {
    const record1 = await db.magazines.byName.get('M2')
    expect(record1.name).equal('M2')

    const record2 = await db.magazines.byFrequency.get(52)
    expect(record2.name).equal('M3')
  })

  it('#getAll', async () => {
    const records1 = await db.magazines.byName.getAll('M4')
    expect(map(records1, 'name')).eql(['M4'])

    const records2 = await db.magazines.byFrequency.getAll({ gte: 30 })
    expect(map(records2, 'name')).eql(['M3', 'M5'])
  })

  it('#count', async () => {
    const count1 = await db.magazines.byName.count({ gte: 'M3' })
    expect(count1).equal(3)

    const count2 = await db.magazines.byFrequency.count({ lt: 12 })
    expect(count2).equal(1)
  })

  it.skip('#cursor', async () => {
    await db.magazines.byName.cursor({
      iterator: iterator(1),
    })
    expect(map(results[1], 'name')).eql(['M1', 'M2', 'M3', 'M4', 'M5'])

    await db.magazines.byFrequency.cursor({
      direction: 'prevunique',
      iterator: iterator(2),
    })
    expect(map(results[2], 'frequency')).eql([52, 24, 12, 6])

    await db.magazines.byFrequency.cursor({
      range: { gte: 20 },
      direction: 'prev',
      iterator: iterator(3),
    })
    expect(map(results[3], 'frequency')).eql([52, 52, 24])
  })

  it.skip('multi entry', async () => {
    const byKeywords = db.store('magazines').index('byKeywords')
    expect(byKeywords.name).equal('byKeywords')
    expect(byKeywords.key).equal('keywords')
    expect(byKeywords.unique).equal(false)
    expect(byKeywords.multi).equal(true)

    const result1 = await byKeywords.get('political')
    expect(result1.name).equal('M1')

    const result2 = await byKeywords.getAll('gaming')
    expect(map(result2, 'name')).eql(['M2', 'M4', 'M5'])

    const result3 = await byKeywords.getAll({ gte: 'c', lte: 'c\uffff' })
    expect(map(result3, 'name')).eql(['M4', 'M5'])

    const result4 = await byKeywords.count('political')
    expect(result4).equal(2)

    await byKeywords.cursor({
      range: 'gaming',
      direction: 'nextunique',
      iterator: iterator(1),
    })
    expect(map(results[1], 'name')).eql(['M2'])

    await byKeywords.cursor({
      range: 'political',
      direction: 'prevunique',
      iterator: iterator(2),
    })
    expect(map(results[2], 'name')).eql(['M1'])
  })
})
