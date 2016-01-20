import { expect } from 'chai'
import { del } from 'idb-factory'
import schema from './support/schema'
import treo from '../src'

describe('Database', () => {
  const dbName = 'treo.database'
  let db

  beforeEach(async () => {
    db = await treo(dbName, schema.version(), schema.callback())
  })

  before(() => del(dbName))
  afterEach(() => del(db || dbName))

  it('#getters - "name", "version", "stores"', () => {
    expect(db.name).equal('treo.database')
    expect(db.version).equal(4)
    expect(db.stores.sort()).eql(['books', 'magazines', 'storage1', 'storage2'])
  })

  it('#del() - delete database and emits "versionchange"', (done) => {
    let isCalled = false
    db.on('versionchange', () => isCalled = true)

    db.del().then(() => {
      expect(isCalled).equal(true)
      done()
    })
  })

  it('#close() - close connection and emits "close"', (done) => {
    db.on('close', done)
    db.close()
  })

  it('#on("error") - for every error', (done) => {
    db.on('error', () => done())
    db.magazines.add({ publisher: 'Leanpub' }).then((key) => {
      db.magazines.add(key, { publisher: 'Leanpub' }).then(() => {
        done('should be an error')
      })
    })
  })

  it('#on("versionchange") - handles automatically', async () => {
    let isCalled = false
    db.on('versionchange', () => isCalled = true)

    await db.magazines.put({ id: 4, words: ['hey'] })

    const newSchema = schema.clone().version(5).addStore('users')
    const newDb = await treo(dbName, newSchema.version(), newSchema.callback())

    expect(newDb.version).equal(5)
    expect(newDb.stores.sort()).eql(['books', 'magazines', 'storage1', 'storage2', 'users'])
    expect(isCalled).equal(true)
    newDb.close()
  })
})
