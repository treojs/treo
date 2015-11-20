import { expect } from 'chai'
import pluck from 'lodash.pluck'
import schema from './support/schema'
import treo from '../src'

describe('Index', () => {
  let db

  beforeEach(() => {
    db = treo('treo.index', schema)
    const magazines = db.store('magazines')

    return Promise.all([
      magazines.put({ name: 'M1', frequency: 12, keywords: ['political'] }),
      magazines.put({ name: 'M2', frequency: 6, keywords: ['gaming'] }),
      magazines.put({ name: 'M3', frequency: 52, keywords: ['political', 'news'] }),
      magazines.put({ name: 'M4', frequency: 24, keywords: ['gadgets', 'gaming', 'computers'] }),
      magazines.put({ name: 'M5', frequency: 52, keywords: ['computers', 'gaming'] }),
    ])
  })

  afterEach(() => {
    return db.del()
  })

  it('has properties', () => {
    const byTitle = db.store('books').index('byTitle')
    expect(byTitle.name).equal('byTitle')
    expect(byTitle.field).equal('title')
    expect(byTitle.unique).equal(true)
    expect(byTitle.multi).equal(false)

    const byKeywords = db.store('magazines').index('byKeywords')
    expect(byKeywords.name).equal('byKeywords')
    expect(byKeywords.field).equal('keywords')
    expect(byKeywords.unique).equal(false)
    expect(byKeywords.multi).equal(true)
  })

  it('#get', () => {
    const magazines = db.store('magazines')
    return Promise.all([
      magazines.index('byName').get('M2'),
      magazines.index('byFrequency').get(52),
      magazines.index('byKeywords').get('political'),
      magazines.index('byNameAndFrequency').get(['M4', 24]),
    ]).then((results) => {
      expect(results[0].name).equal('M2')
      expect(results[1].name).equal('M3')
      expect(results[2].name).equal('M1')
      expect(results[3].name).equal('M4')
    })
  })

  it('#getAll', () => {
    const magazines = db.store('magazines')
    return Promise.all([
      magazines.index('byName').getAll('M4'),
      magazines.index('byFrequency').getAll({ gte: 30 }),
      magazines.index('byKeywords').getAll('gaming'),
      magazines.index('byKeywords').getAll({ gte: 'c', lte: 'c\uffff' }),
    ]).then((results) => {
      expect(pluck(results[0], 'name')).eql(['M4'])
      expect(pluck(results[1], 'name')).eql(['M3', 'M5'])
      expect(pluck(results[2], 'name')).eql(['M2', 'M4', 'M5'])
      expect(pluck(results[3], 'name')).eql(['M4', 'M5'])
    })
  })

  it('#count', () => {
    const magazines = db.store('magazines')
    return Promise.all([
      magazines.index('byName').count({ gte: 'M3' }),
      magazines.index('byFrequency').count({ lt: 12 }),
      magazines.index('byKeywords').count('political'),
    ]).then((results) => {
      expect(results[0]).equal(3)
      expect(results[1]).equal(1)
      expect(results[2]).equal(2)
    })
  })

  it('#cursor', () => {
    const magazines = db.store('magazines')
    const results = {}

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

      magazines.index('byKeywords').cursor({
        range: 'gaming',
        direction: 'nextunique',
        iterator: iterator(4),
      }).then(() => {
        expect(pluck(results[4], 'name')).eql(['M2'])
      }),

      magazines.index('byKeywords').cursor({
        range: 'political',
        direction: 'prevunique',
        iterator: iterator(5),
      }).then(() => {
        expect(pluck(results[5], 'name')).eql(['M1'])
      }),
    ])

    function iterator(index) {
      results[index] = []
      return (cursor) => {
        results[index].push(cursor.value)
        cursor.continue()
      }
    }
  })
})
