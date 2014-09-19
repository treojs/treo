/* globals after */
var expect = require('chai').expect;
var treo = require('../lib');
var Promise = require('promise');
var websql = require('../plugins/treo-websql');
var findIn = require('../examples/find-in');

describe('integration', function() {
  this.timeout(10000);
  var db, modules;

  before(function(done) {
    var data = require('./fixtures/npm-data.json');
    var schema = treo.schema()
      .version(1)
        .addStore('modules', { keyPath: 'name' })
      .version(2)
        .getStore('modules')
        .addIndex('byKeywords', 'keywords', { multiEntry: true })
        .addIndex('byAuthor', 'author')
        .addIndex('byStars', 'stars')
        .addIndex('byMaintainers', 'maintainers', { multi: true });

    db = treo('npm', schema).use(websql());
    modules = db.store('modules');
    modules.batch(data, done);
  });

  after(function(done) {
    db.drop(done);
  });

  it('get module', function(done) {
    modules.get('browserify', function(err, mod) {
      if (err) return done(err);
      expect(mod).exist;
      expect(mod.author).equal('James Halliday');
      done();
    });
  });

  it('count all modules', function(done) {
    modules.count(function(err, count) {
      if (err) return done(err);
      expect(count).equal(473);
      done();
    });
  });

  it('count by index', function(done) {
    modules.index('byStars').count({ gte: 100 }, function(err, count) {
      try { expect(count).equal(12) } catch (_) { done(_) }
      modules.index('byKeywords').count('grunt', function(err2, count) {
        try { expect(count).equal(9) } catch (_) { done(_) }
        modules.index('byMaintainers').count('tjholowaychuk', function(err3, count) {
          try { expect(count).equal(36) } catch (_) { done(_) }
          done(err || err2 || err3);
        });
      });
    });
  });

  it('find in set of ids', function(done) {
    findIn(modules, ['async', 'request', 'component', 'bla-bla'], function(err, records) {
      if (err) return done(err);
      expect(records).length(4);
      expect(records[1]).undefined;
      done();
    });
  });

  it('works with then/promise', function(done) {
    modules.get = Promise.denodeify(modules.get);
    Promise.all([
      modules.get('async'),
      modules.get('request'),
      modules.get('component'),
    ]).then(function(records) {
      expect(records).length(3);
      done();
    }, done);
  });
});
