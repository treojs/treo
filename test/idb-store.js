import { expect } from 'chai'
import pluck from 'lodash.pluck'
import schema from './support/schema'
import treo from './support/treo'

describe('Store', () => {
  let db

  beforeEach(() => {
    db = treo('treo.store', schema)
    const magazines = db.store('magazines')
    return Promise.all([
      magazines.put({ id: 'id1', title: 'Quarry Memories', publisher: 'Bob' }),
      magazines.put({ id: 'id2', title: 'Water Buffaloes', publisher: 'Bob' }),
      magazines.put({ id: 'id3', title: 'Bedrocky Nights', publisher: 'Tim' }),
      magazines.put({ id: 'id4', title: 'Waving Wings', publisher: 'Ken' }),
    ])
  })

  afterEach(() => {
    return db.del()
  })

  it('has properties', () => {
    const books = db.store('books')
    const magazines = db.store('magazines')

    expect(books.key).equal('isbn')
    expect(books.name).equal('books')
    expect(books.indexes).length(3)

    expect(magazines.key).equal('id')
    expect(magazines.name).equal('magazines')
    expect(magazines.indexes).length(4)
  })

  it('#put', () => {
    const books = db.store('books')
    const magazines = db.store('magazines')
    const storage = db.store('storage')

    return Promise.all([
      books.put('id1', { title: 'Quarry Memories', author: 'Fred' }).then((key) => {
        expect(key).equal('id1')
        return books.get('id1').then((book) => {
          expect(book).eql({ title: 'Quarry Memories', author: 'Fred', isbn: 'id1' })
        })
      }),
      magazines.put({ name: 'new magazine' }).then((key) => {
        return magazines.get(key).then((magazine) => {
          expect(magazine.id).equal(key)
          expect(magazine.name).equal('new magazine')
        })
      }),
      storage.put('key', 'value').then(() => {
        return storage.get('key').then((val) => {
          expect(val).equal('value')
        })
      }),
    ])
  })

  it('#del', () => {
    const magazines = db.store('magazines')
    return magazines.del('id1').then(() => {
      return Promise.all([
        magazines.get('id1').then((val) => expect(val).equal(undefined)),
        magazines.count().then((count) => expect(count).equal(3)),
      ])
    })
  })

  it('#count', () => {
    const magazines = db.store('magazines')
    return Promise.all([
      magazines.count(),
      magazines.count('id3'),
      magazines.count({ gte: 'id2' }),
    ]).then((results) => {
      expect(results[0]).equal(4)
      expect(results[1]).equal(1)
      expect(results[2]).equal(3)
    })
  })

  it('#clear', () => {
    const magazines = db.store('magazines')
    return magazines.clear().then(() => {
      return magazines.count().then((count) => expect(count).equal(0))
    })
  })

  it('#getAll', () => {
    const magazines = db.store('magazines')
    return Promise.all([
      magazines.getAll().then((result) => {
        expect(pluck(result, 'id')).eql(['id1', 'id2', 'id3', 'id4'])
      }),
      magazines.getAll({ gt: 'id2' }).then((result) => {
        expect(pluck(result, 'id')).eql(['id3', 'id4'])
      }),
    ])
  })

  it('#batch', () => {
    const magazines = db.store('magazines')
    const storage = db.store('storage')

    return Promise.all([
      magazines.batch({
        id1: null,
        id3: { title: 'Bedrocky Nights', publisher: 'Bob' },
        id4: { title: 'Heavy Weighting', publisher: 'Bob' },
        id2: null,
      }).then(() => {
        return Promise.all([
          magazines.count().then((count) => expect(count).equal(2)),
          magazines.get('id3').then((val) => expect(val.publisher).equal('Bob')),
        ])
      }),

      storage.batch({
        foo: 'val 1',
        bar: 'val 2',
        baz: 'val 3',
      }, () => {
        return Promise.all([
          storage.get('bar').then((val) => expect(val).equal('val 2')),
          storage.get('fake').then((val) => expect(val).not.exist),
          storage.count().then((count) => expect(count).equal(3)),
        ])
      }),
    ])
  })

  it('#cursor', () => {
    const magazines = db.store('magazines')
    const results = {}

    return Promise.all([
      magazines.cursor({ iterator: iterator(1) }).then(() => {
        expect(pluck(results[1], 'id')).eql(['id1', 'id2', 'id3', 'id4'])
      }),

      magazines.cursor({
        direction: 'prev',
        iterator: iterator(2),
      }).then(() => {
        expect(pluck(results[2], 'id')).eql(['id4', 'id3', 'id2', 'id1'])
      }),

      magazines.cursor({
        range: { lte: 'id2' },
        iterator: iterator(3),
      }).then(() => {
        expect(pluck(results[3], 'id')).eql(['id1', 'id2'])
      }),

      magazines.cursor({
        range: { lte: 'id3' },
        direction: 'prev',
        iterator: iterator(4),
      }).then(() => {
        expect(pluck(results[4], 'id')).eql(['id3', 'id2', 'id1'])
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
