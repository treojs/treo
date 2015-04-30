const expect = require('chai').expect
const Promise = require('es6-promise').Promise
const treo = require('../lib')
const schema = require('./support/schema')

describe.only('Database', () => {
  let db
  treo.Promise = Promise // set Promise library

  beforeEach(() => {
    db = treo('treo.database', schema)
  })

  afterEach(() => {
    return db.del()
  })

  it('has properties', () => {
    expect(db.name).equal('treo.database')
    expect(db.version).equal(4)
    expect(db.stores).length(3)
  })

  it('supports parallel write & read', () => {
    const books = db.store('books')
    const magazines = db.store('magazines')

    return Promise.all([
      books.batch({ 1: { name: 'book 1' }, 2: { id: 2, name: 'book 2' } }),
      books.put(3, { id: 3, name: 'book 3' }),
      magazines.del(5),
      magazines.put({ id: 4, message: 'hey' }),
    ]).then(() => {
      return Promise.all([
        books.getAll().then((records) => { expect(records).length(3) }),
        magazines.count().then((count) => { expect(count).equal(1) }),
      ])
    })
  })

  it('handles "onversionchange" automatically', () => {
    let isCalled
    db.on('versionchange', () => { isCalled = true })

    return db.store('magazines').put({ id: 4, words: ['hey'] }).then(() => {
      const newSchema = schema.clone().version(5).addStore('users')
      const newDb = treo('treo.database', newSchema)

      expect(newDb.version).equal(5)
      expect(newDb.stores.sort()).eql(['books', 'magazines', 'storage', 'users'])

      return Promise.all([
        newDb.store('users').put(1, { name: 'Jon' }).then((key) => {
          expect(key).equal(1)
        }),
        newDb.store('magazines').get(4, (err, obj) => {
          expect(obj).eql({ id: 4, words: ['hey'] })
        }),
      ]).then(() => {
        expect(db.status).equal('close')
        expect(isCalled).true
      })
    })
  })

  it('#close', () => {
    return db.close().then(() => {
      expect(db.status).equal('close')
      expect(db.origin).null
      expect(Object.keys(db._callbacks || {})).length(0)
    })
  })

  it('#on "abort", "error"', (done) => {
    const magazines = db.store('magazines')
    const events = []

    magazines.put({ publisher: 'Leanpub' }).then((val) => {
      magazines.add({ id: val, publisher: 'Leanpub' }) // dublicate key

      db.on('error', (err) => {
        expect(err).exist
        events.push('error')
        if (events.length == 2) return done()
      })
      db.on('abort', () => {
        expect(arguments).length(0)
        events.push('abort')
        if (events.length == 2) return done()
      })
    })
  })
})
