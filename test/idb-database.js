import { expect } from 'chai'
import schema from './support/schema'
import treo from '../src'

describe('Database', () => {
  let db

  beforeEach(() => {
    db = treo('treo.database', schema)
  })

  afterEach(() => {
    return db.del()
  })

  it('has properties', () => {
    expect(treo).a('function')
    expect(treo).keys(['Database', 'Index', 'Schema', 'Store', 'schema'])
    expect(db.name).equal('treo.database')
    expect(db.version).equal(4)

    expect(db.stores.sort()).eql(['books', 'magazines', 'storage'])
    expect(db.books instanceof treo.Store).equal(true)
    expect(db.magazines instanceof treo.Store).equal(true)
    expect(db.storage instanceof treo.Store).equal(true)
    expect(typeof db.something === 'undefined').equal(true)
  })

  it('supports parallel write & read', () => {
    const books = db.store('books')
    const magazines = db.store('magazines')

    // parallel write
    return Promise.all([
      books.batch({ 1: { name: 'book 1' }, 2: { id: 2, name: 'book 2' } }),
      books.put(3, { id: 3, name: 'book 3' }),
      magazines.del(5),
      magazines.put({ id: 4, message: 'hey' }),
    ]).then(() => {
      // parallel read
      return Promise.all([
        books.getAll().then((records) => expect(records).length(3)),
        magazines.count().then((count) => expect(count).equal(1)),
      ])
    })
  })

  it('#close', () => {
    return db.getInstance().then(() => {
      expect(db.status).equal('open')
      db.close()
      expect(db.status).equal('close')
      expect(db.origin).equal(null)
    })
  })

  it('#on "error"', (done) => {
    const magazines = db.store('magazines')

    magazines.put({ publisher: 'Leanpub' }).then((val) => {
      magazines.add(val, { publisher: 'Leanpub' }).then(() => {
        done('should be an error')
      })
      db.on('error', (err) => {
        expect(!!err).equal(true)
        done()
      })
    })
  })

  it('#on "versionchange" automatically', () => {
    let isCalled = false
    db.on('versionchange', () => { isCalled = true })

    return db.store('magazines').put({ id: 4, words: ['hey'] }).then(() => {
      const newSchema = schema.clone().version(5).addStore('users')
      const newDb = treo('treo.database', newSchema)

      expect(newDb.version).equal(5)
      expect(newDb.stores.sort()).eql(['books', 'magazines', 'storage', 'users'])

      return Promise.all([
        newDb.store('users').put(1, { name: 'John' }).then((key) => {
          expect(key).equal(1)
        }),
        newDb.store('magazines').get(4, (err, obj) => {
          expect(obj).eql({ id: 4, words: ['hey'] })
        }),
      ]).then(() => {
        expect(db.status).equal('close')
        expect(isCalled).equal(true)
        expect(newDb.status).equal('open')
        newDb.close()
      })
    })
  })
})
