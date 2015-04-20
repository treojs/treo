const expect = require('chai').expect
const Promise = require('es6-promise').Promise
const treo = require('../lib')
const data = require('./support/npm-data.json')

describe('Integration test', function() {
  let db, modules, schema;
  treo.Promise = Promise // set Promise library

  before(function() {
    this.timeout(10000)
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

  after(function() {
    return db.del()
  })

  it('get module', function() {
    return modules.get('browserify').then(function(mod) {
      expect(mod).exist
      expect(mod.author).equal('James Halliday')
    })
  })

  it('count all modules', function() {
    return modules.count().then(function(count) {
      expect(count).equal(473)
    })
  })

  it('count by index', function() {
    return Promise.all([
      modules.index('byStars').count({ gte: 100 }).then(function(count) {
        expect(count).equal(12)
      }),
      modules.index('byKeywords').count('grunt').then(function(count) {
        expect(count).equal(9)
      }),
      modules.index('byMaintainers').count('tjholowaychuk').then(function(count) {
        expect(count).equal(36)
      }),
    ])
  })
})
