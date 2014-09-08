/* globals after */
if (!window.indexedDB || window.indexedDB.__useShim) return;
var expect = require('chai').expect;
var treo = require('../lib');
var Promise = require('promise');
var findIn = require('../examples/find-in');

describe('integration', function() {
  var db, modules;

  before(function(done) {
    var data = require('./support/npm-data.json');
    var schema = treo.schema()
      .version(1)
        .addStore('modules', { keyPath: 'name' })
      .version(2)
        .getStore('modules')
        .addIndex('byKeywords', 'keywords', { multiEntry: true })
        .addIndex('byAuthor', 'author')
        .addIndex('byStars', 'stars')
        .addIndex('byMaintainers', 'maintainers', { multi: true });

    db = treo('npm', schema);
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
    var next = require('after')(3, done);

    modules.index('byStars').count({ gte: 100 }, function(err, count) {
      if (err) return done(err);
      expect(count).equal(12);
      next();
    });

    modules.index('byKeywords').count('grunt', function(err, count) {
      if (err) return done(err);
      expect(count).equal(9);
      next();
    });

    modules.index('byMaintainers').count('tjholowaychuk', function(err, count) {
      if (err) return done(err);
      expect(count).equal(36);
      next();
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
