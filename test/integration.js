var expect = require('chai').expect;
var Promise = require('es6-promise').Promise;
var treo = require('../lib');
var data = require('./fixtures/npm-data.json');

describe.only('integration', function() {
  var db, modules;

  before(function() {
    var schema = treo.schema()
    .addStore('modules', { keyPath: 'name' })
    .addIndex('byKeywords', 'keywords', { multiEntry: true })
    .addIndex('byAuthor', 'author')
    .addIndex('byStars', 'stars')
    .addIndex('byMaintainers', 'maintainers', { multi: true });

    treo.Promise = Promise; // set Promise library
    db = treo('npm', schema);

    modules = db.store('modules');
    return modules.batch(data);
  });

  after(function() {
    return db.drop();
  });

  it('get module', function() {
    return modules.get('browserify').then(function(mod) {
      expect(mod).exist;
      expect(mod.author).equal('James Halliday');
    });
  });

  it('count all modules', function() {
    return modules.count().then(function(count) {
      expect(count).equal(473);
    });
  });

  it('count by index', function() {
    return Promise.all([
      modules.index('byStars').count({ gte: 100 }).then(function(count) {
        expect(count).equal(12);
      }),
      modules.index('byKeywords').count('grunt').then(function(count) {
        expect(count).equal(9);
      }),
      modules.index('byMaintainers').count('tjholowaychuk').then(function(count) {
        expect(count).equal(36);
      }),
    ]);
  });
});
