import { expect } from 'chai'
import { del } from 'idb-factory'
import { mapCursor } from 'idb-request'
import { takeRight } from 'idb-take'
import map from 'lodash.map'
import schema from './support/schema'
import treo from '../src'

describe('Index', () => {
  const dbName = 'treo.index'
  let db

  beforeEach(async () => {
    db = await treo(dbName, schema.version(), schema.callback())
    await db.magazines.batch([
      { type: 'put', value: { name: 'M1', frequency: 12, keywords: ['political'] } },
      { type: 'put', value: { name: 'M2', frequency: 6, keywords: ['gaming'] } },
      { type: 'put', value: { name: 'M3', frequency: 52, keywords: ['political', 'news'] } },
      { type: 'put', value: { name: 'M4', frequency: 24, keywords: ['gadgets', 'gaming', 'computers'] } },
      { type: 'put', value: { name: 'M5', frequency: 52, keywords: ['computers', 'gaming'] } },
    ])
  })

  before(() => del(dbName))
  afterEach(() => del(db || dbName))

  it('#getters - "name", "key", "unique", "multi"', () => {
    const byAuthor = db.store('books').index('byAuthor')
    expect(byAuthor.name).equal('byAuthor')
    expect(byAuthor.key).equal('author')
    expect(byAuthor.unique).equal(false)

    const byNameAndFrequency = db.store('magazines').index('byNameAndFrequency')
    expect(byNameAndFrequency.name).equal('byNameAndFrequency')
    expect(byNameAndFrequency.key).eql(['name', 'frequency'])
    expect(byNameAndFrequency.unique).equal(true)
  })

  it('#get(key) - returns one record', async () => {
    const { byName, byFrequency } = db.magazines

    expect((await byName.get('M2')).name).equal('M2')
    expect((await byFrequency.get(52)).name).equal('M3')
    expect(await byFrequency.get(100)).equal(undefined)
  })

  it('#getAll([range], [limit]) - returns many recors', async () => {
    const { byName, byFrequency } = db.magazines

    const records1 = await byName.getAll()
    expect(records1).length(5)

    const records2 = await byName.getAll({ gte: 'M2' }, 2)
    expect(map(records2, 'name')).eql(['M2', 'M3'])

    const records3 = await byFrequency.getAll(null, 3)
    expect(map(records3, 'name')).eql(['M2', 'M1', 'M4'])
  })

  it('#count(range) - count records in optional range', async () => {
    const { byName, byFrequency } = db.magazines

    expect(await byName.count({ gte: 'M3' })).equal(3)
    expect(await byFrequency.count({ lt: 12 })).equal(1)
  })

  it('#openCursor(range, [direction]) - proxy to native openCursor', async () => {
    const req = db.magazines.byFrequency.openCursor({ gte: 10, lt: 30 }, 'prevunique')
    const res1 = await mapCursor(req, (cursor, memo) => {
      memo.push(cursor.value)
      cursor.continue()
    })
    expect(map(res1, 'name')).eql(['M4', 'M1'])

    const res2 = await takeRight(db.magazines.byFrequency, { gte: 10, lt: 30 })
    expect(res2).eql(res1)
  })
})
