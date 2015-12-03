import { expect } from 'chai'
import Schema from 'idb-schema'
import data from './support/npm-data.json'
import treo from '../src'

describe('Integration test', function treoIntegration() {
  this.timeout(10000)
  let db
  const schema = new Schema()
  .addStore('modules', { keyPath: 'name' })
  .addIndex('byKeywords', 'keywords', { multiEntry: true })
  .addIndex('byAuthor', 'author')
  .addIndex('byStars', 'stars')
  .addIndex('byMaintainers', 'maintainers', { multi: true })

  before(async () => {
    db = await treo('npm', schema.version(), schema.callback())
    await db.modules.batch(data.map((d) => {
      return { key: d.name, val: d, type: 'put' }
    }))
  })
  after(() => db.del())

  it('get module', async () => {
    const { author } = await db.modules.get('browserify')
    expect(author).equal('James Halliday')
  })

  it('count all modules', async () => {
    expect(await db.modules.count()).equal(473)
  })

  it('count by index', async () => {
    expect(await db.modules.byStars.count({ gte: 100 })).equal(12)
  })

  it.skip('count using multiEntry index', async () => {
    await Promise.all([
      db.modules.byKeywords.count('grunt').then((c) => expect(c).equal(9)),
      db.modules.byMaintainers.count('tjholowaychuk').then((c) => expect(c).equal(36)),
    ])
  })
})
