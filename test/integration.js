import { expect } from 'chai'
import data from './support/npm-data.json'
import treo from '../src'

describe('Integration test', function treoIntegration() {
  this.timeout(10000)
  let db

  before(() => {
    const schema = treo.schema()
    .addStore('modules', { keyPath: 'name' })
    .addIndex('byKeywords', 'keywords', { multiEntry: true })
    .addIndex('byAuthor', 'author')
    .addIndex('byStars', 'stars')
    .addIndex('byMaintainers', 'maintainers', { multi: true })

    db = treo('npm', schema)
    return db.modules.batch(data)
  })

  after(() => {
    return db.del()
  })

  it('get module', () => {
    return db.modules.get('browserify').then((mod) => {
      expect(mod.author).equal('James Halliday')
    })
  })

  it('count all modules', () => {
    return db.modules.count().then((count) => {
      expect(count).equal(473)
    })
  })

  it('count by index', () => {
    return Promise.all([
      db.modules.byStars.count({ gte: 100 }).then((c) => expect(c).equal(12)),
      db.modules.byKeywords.count('grunt').then((c) => expect(c).equal(9)),
      db.modules.byMaintainers.count('tjholowaychuk').then((c) => expect(c).equal(36)),
    ])
  })
})
