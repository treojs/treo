import { expect } from 'chai'
import { del } from 'idb-factory'
import pluck from 'lodash.pluck'
import schema from './support/schema'
import treo from '../src'

describe('Store', () => {
  let db

  beforeEach(async () => {
    db = await treo('treo.store', schema.version(), schema.callback())
    await [
      db.magazines.put({ id: 'id1', title: 'Quarry Memories', publisher: 'Bob' }),
      db.magazines.put({ id: 'id2', title: 'Water Buffaloes', publisher: 'Bob' }),
      db.magazines.put({ id: 'id3', title: 'Bedrocky Nights', publisher: 'Tim' }),
      db.magazines.put({ id: 'id4', title: 'Waving Wings', publisher: 'Ken' }),
    ]
  })

  before(() => del('treo.store'))
  afterEach(() => db.del())

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

  it('#put', async () => {
    await db.books.put('id1', { title: 'Quarry Memories', author: 'Fred' }).then((key) => {
      expect(key).equal('id1')
      return db.books.get('id1').then((book) => {
        expect(book).eql({ title: 'Quarry Memories', author: 'Fred', isbn: 'id1' })
      })
    })

    await db.magazines.put({ name: 'new magazine' }).then((key) => {
      return db.magazines.get(key).then((magazine) => {
        expect(magazine.id).equal(key)
        expect(magazine.name).equal('new magazine')
      })
    })

    await db.storage1.put('key', 'value').then(() => {
      return db.storage1.get('key').then((val) => {
        expect(val).equal('value')
      })
    })
  })

  it('#del', async () => {
    await db.magazines.del('id1')
    expect(await db.magazines.get('id1')).equal(undefined)
    expect(await db.magazines.count()).equal(3)
  })

  it('#count', async () => {
    expect(await db.magazines.count()).equal(4)
    expect(await db.magazines.count('id3')).equal(1)
    expect(await db.magazines.count({ gte: 'id2' })).equal(3)
  })

  it('#clear', async () => {
    await db.magazines.clear()
    expect(await db.magazines.count()).equal(0)
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
    const storage = db.store('storage1')

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

  it('validates unique index', (done) => {
    const books = db.store('books')
    const magazines = db.store('magazines')

    // simple index
    books.put(1, { title: 'book' }).then(() => {
      books.put(2, { title: 'book' }).then(notSupported('simple index'), (err1) => {
        expect(!!err1).equal(true)

        // compound index
        magazines.add({ name: 'magazine', frequency: 1 }).then(() => {
          magazines.add({ name: 'magazine', frequency: 1 }).then(notSupported('compound index'), (err2) => {
            expect(!!err2).equal(true)

            // batch
            books.batch({
              5: { title: 'book', author: 'Petr' },
              6: { title: 'book', author: 'John' },
            }).then(notSupported('batch'), (err3) => {
              expect(!!err3).equal(true)
              done()
            })
          })
        })
      })
    })

    function notSupported(testName) {
      return () => {
        done(`expected unique index error for "${testName}"`)
      }
    }
  })

  it('allows the same keys in different stores', () => {
    const storage1 = db.store('storage1')
    const storage2 = db.store('storage2')
    const books = db.store('books')

    return Promise.all([
      storage1.put('1', 'val11'),
      storage1.put(1, 'val12'),
      storage1.put([1], 'val13'),
      storage2.put('1', 'val21'),
      storage2.put(1, 'val22'),
      books.put(1, { name: 'My book' }),
    ]).then(() => {
      return Promise.all([ storage1.count(), storage2.count(), books.count() ]).then(([c1, c2, c3]) => {
        expect(c1).equal(3)
        expect(c2).equal(2)
        expect(c3).equal(1)
      })
    })
  })
})
