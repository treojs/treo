import { expect } from 'chai'
import { del, open } from 'idb-factory'
import Schema from 'idb-schema'
import npmData from './support/npm-data.json'
import schema from './support/schema'
import treo, { Database, Store, Index } from '../src'

describe('Misc', () => {
  const dbName = 'treo.integration'
  const npmSchema = new Schema()
  .addStore('modules', { keyPath: 'name' })
  .addIndex('byAuthor', 'author')
  .addIndex('byStars', 'stars')

  const allModules = npmData.map((d) => ({ key: d.name, val: d, type: 'put' }))
  const first50Modules = allModules.slice(0, 50)

  let db
  before(() => del(dbName))
  afterEach(() => del(db || dbName))

  it('works with large data', async function largeDataTest() {
    this.timeout(10000)

    db = await treo(dbName, npmSchema.version(), npmSchema.callback())
    await db.modules.batch(allModules)

    expect(await db.modules.count()).equal(473)
    expect(await db.modules.byStars.count({ gte: 100 })).equal(12)
    expect(await db.modules.byAuthor.getAll('TJ Holowaychuk')).length(30)
  })

  it('works with standalone classes', async () => {
    db = await open(dbName, npmSchema.version(), npmSchema.callback())

    const wrappedDb = new Database(db)
    expect(wrappedDb.stores).eql(['modules'])
    expect(wrappedDb.version).equal(npmSchema.version())

    const store = new Store(db, 'modules')
    expect(store.indexes).eql(['byAuthor', 'byStars'])
    await store.batch(first50Modules)
    expect(await store.count()).equal(50)

    const index = new Index(db, 'modules', 'byStars')
    expect(await index.count({ gte: 50 })).equal(4)
  })

  it('allows the same keys in different stores', async () => {
    db = await treo(dbName, schema.version(), schema.callback())

    const storage1 = db.store('storage1')
    const storage2 = db.store('storage2')
    const books = db.store('books')

    await Promise.all([
      storage1.put('1', 'val11'),
      storage1.put(1, 'val12'),
      storage1.put([1], 'val13'),
      storage2.put('1', 'val21'),
      storage2.put(1, 'val22'),
      books.put(1, { name: 'My book' }),
    ])

    const [c1, c2, c3] = await Promise.all([
      storage1.count(),
      storage2.count(),
      books.count(),
    ])

    expect(c1).equal(3)
    expect(c2).equal(2)
    expect(c3).equal(1)
  })

  it('supports parallel read/write', async () => {
    db = await treo(dbName, schema.version(), schema.callback())
    const { books, magazines } = db

    // parallel write
    await Promise.all([
      books.batch({ 1: { name: 'book 1' }, 2: { id: 2, name: 'book 2' } }),
      books.put(3, { id: 3, name: 'book 3' }),
      magazines.del(5),
      magazines.put({ id: 4, message: 'hey' }),
    ])

    // parallel read
    await Promise.all([
      books.getAll().then((records) => expect(records).length(3)),
      magazines.count().then((count) => expect(count).equal(1)),
    ])
  })
})
