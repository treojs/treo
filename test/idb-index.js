import { expect } from 'chai'
import { del } from 'idb-factory'
import pluck from 'lodash.pluck'
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

  beforeEach(() => {
    db = treo('treo.index', schema)
    results = {}
    const magazines = db.store('magazines')

    return Promise.all([
      magazines.put({ name: 'M1', frequency: 12, keywords: ['political'] }),
      magazines.put({ name: 'M2', frequency: 6, keywords: ['gaming'] }),
      magazines.put({ name: 'M3', frequency: 52, keywords: ['political', 'news'] }),
      magazines.put({ name: 'M4', frequency: 24, keywords: ['gadgets', 'gaming', 'computers'] }),
      magazines.put({ name: 'M5', frequency: 52, keywords: ['computers', 'gaming'] }),
    ])
  })

  before(() => del('treo.index'))
  afterEach(() => db.del())

  it('has properties', () => {
    const byTitle = db.store('books').index('byTitle')
    expect(byTitle.name).equal('byTitle')
    expect(byTitle.field).equal('title')
    expect(byTitle.unique).equal(true)
    expect(byTitle.multi).equal(false)
  })

  it('#get', () => {
    const magazines = db.store('magazines')
    return Promise.all([
      magazines.index('byName').get('M2'),
      magazines.index('byFrequency').get(52),
    ]).then(([byName, byFrequency]) => {
      expect(byName.name).equal('M2')
      expect(byFrequency.name).equal('M3')
    })
  })

  it('#getAll', () => {
    const magazines = db.store('magazines')
    return Promise.all([
      magazines.index('byName').getAll('M4'),
      magazines.index('byFrequency').getAll({ gte: 30 }),
    ]).then(([byName, byFrequency]) => {
      expect(pluck(byName, 'name')).eql(['M4'])
      expect(pluck(byFrequency, 'name')).eql(['M3', 'M5'])
    })
  })

  it('#count', () => {
    const magazines = db.store('magazines')
    return Promise.all([
      magazines.index('byName').count({ gte: 'M3' }),
      magazines.index('byFrequency').count({ lt: 12 }),
    ]).then(([byName, byFrequency]) => {
      expect(byName).equal(3)
      expect(byFrequency).equal(1)
    })
  })

  it('#cursor', () => {
    const magazines = db.store('magazines')

    return Promise.all([
      magazines.index('byName').cursor({
        iterator: iterator(1),
      }).then(() => {
        expect(pluck(results[1], 'name')).eql(['M1', 'M2', 'M3', 'M4', 'M5'])
      }),

      magazines.index('byFrequency').cursor({
        direction: 'prevunique',
        iterator: iterator(2),
      }).then(() => {
        expect(pluck(results[2], 'frequency')).eql([52, 24, 12, 6])
      }),

      magazines.index('byFrequency').cursor({
        range: { gte: 20 },
        direction: 'prev',
        iterator: iterator(3),
      }).then(() => {
        expect(pluck(results[3], 'frequency')).eql([52, 52, 24])
      }),
    ])
  })

  it.skip('multiEntry', () => {
    const byKeywords = db.store('magazines').index('byKeywords')
    expect(byKeywords.name).equal('byKeywords')
    expect(byKeywords.field).equal('keywords')
    expect(byKeywords.unique).equal(false)
    expect(byKeywords.multi).equal(true)

    return Promise.all([
      byKeywords.get('political').then((result) => {
        expect(result.name).equal('M1')
      }),

      byKeywords.getAll('gaming').then((result) => {
        expect(pluck(result, 'name')).eql(['M2', 'M4', 'M5'])
      }),
      byKeywords.getAll({ gte: 'c', lte: 'c\uffff' }).then((result) => {
        expect(pluck(result, 'name')).eql(['M4', 'M5'])
      }),

      byKeywords.count('political').then((result) => {
        expect(result).equal(2)
      }),

      byKeywords.cursor({
        range: 'gaming',
        direction: 'nextunique',
        iterator: iterator(1),
      }).then(() => {
        expect(pluck(results[1], 'name')).eql(['M2'])
      }),
      byKeywords.cursor({
        range: 'political',
        direction: 'prevunique',
        iterator: iterator(2),
      }).then(() => {
        expect(pluck(results[2], 'name')).eql(['M1'])
      }),
    ])
  })
})
