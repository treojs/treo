import { expect } from 'chai'
import data from './support/npm-data.json'
import treo from './support/treo'

describe('Integration test', function treoIntegration() {
  this.timeout(10000)
  let db, modules, schema

  before(() => {
    schema = treo.schema()
    .addStore('modules', { keyPath: 'name' })
    .addIndex('byKeywords', 'keywords', { multiEntry: true })
    .addIndex('byAuthor', 'author')
    .addIndex('byStars', 'stars')
    .addIndex('byMaintainers', 'maintainers', { multi: true })

    db = treo('npm', schema)
    modules = db.store('modules')
    return modules.batch(data)
  })

  after(() => {
    return db.del()
  })

  it('get module', () => {
    return modules.get('browserify').then((mod) => {
      expect(mod.author).equal('James Halliday')
    })
  })

  it('count all modules', () => {
    return modules.count().then((count) => {
      expect(count).equal(473)
    })
  })

  it('count by index', () => {
    return Promise.all([
      modules.index('byStars').count({ gte: 100 }).then((count) => {
        expect(count).equal(12)
      }),
      modules.index('byKeywords').count('grunt').then((count) => {
        expect(count).equal(9)
      }),
      modules.index('byMaintainers').count('tjholowaychuk').then((count) => {
        expect(count).equal(36)
      }),
    ])
  })
})
