const expect = require('chai').expect
const Promise = require('es6-promise').Promise
const treo = require('../lib')
const data = require('./support/npm-data.json')

describe('Integration test', () => {
  let db, modules, schema
  treo.Promise = Promise // set Promise library

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
      expect(mod).exist
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
