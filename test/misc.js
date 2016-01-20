import { expect } from 'chai'
import { del, open } from 'idb-factory'
import Schema from 'idb-schema'
import npmData from './support/npm-data.json'
import treo, { Database, Store, Index } from '../src'

describe('Misc', () => {
  const dbName = 'treo.integration'
  const schema = new Schema()
  .addStore('modules', { keyPath: 'name' })
  .addIndex('byAuthor', 'author')
  .addIndex('byStars', 'stars')

  const allModules = npmData.map((d) => { return { key: d.name, val: d, type: 'put' } })
  const first50Modules = allModules.slice(0, 50)

  let db
  before(() => del(dbName))
  afterEach(() => del(db || dbName))

  it('works with large data', async function largeDataTest() {
    this.timeout(10000)

    db = await treo(dbName, schema.version(), schema.callback())
    await db.modules.batch(allModules)

    expect(await db.modules.count()).equal(473)
    expect(await db.modules.byStars.count({ gte: 100 })).equal(12)
    expect(await db.modules.byAuthor.getAll('TJ Holowaychuk')).length(30)
  })

  it('works with standalone classes', async () => {
    db = await open(dbName, schema.version(), schema.callback())

    const wrappedDb = new Database(db)
    expect(wrappedDb.stores).eql(['modules'])
    expect(wrappedDb.version).equal(schema.version())

    const store = new Store(db, 'modules')
    expect(store.indexes).eql(['byAuthor', 'byStars'])
    await store.batch(first50Modules)
    expect(await store.count()).equal(50)

    const index = new Index(db, 'modules', 'byStars')
    expect(await index.count({ gte: 50 })).equal(4)
  })
})
