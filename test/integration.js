/* globals after */
if (!window.indexedDB) require('./vendor/indexeddb-shim');
var expect = require('chai').expect;
var runAfter = require('after');
var treo = require('treo');
var Promise = require('promise');
var findIn = require('../examples/find-in');

describe.only('integration', function() {
  this.timeout(20000); // 10s
  var db, modules;

  before(function(done) {
    var data = require('./support/npm-data.json');
    var schema = treo.schema()
      .version(1)
        .addStore('modules', { key: 'name' })
      .version(2)
        .getStore('modules')
        .addIndex('byKeywords', 'keywords', { multi: true })
        .addIndex('byAuthor', 'author')
        .addIndex('byStars', 'stars')
        .addIndex('byMaintainers', 'maintainers', { multi: true });

    db = treo('npm', schema);
    modules = db.store('modules');

    console.time('load records');
    modules.batch(data, function(err) {
      if (err) return done(err);
      console.timeEnd('load records');
      done();
    });
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
      expect(count).equal(7892);
      done();
    });
  });

  it('count by index', function(done) {
    var next = runAfter(3, done);

    modules.index('byStars').count({ gte: 100 }, function(err, count) {
      if (err) return done(err);
      expect(count).equal(12);
      next();
    });

    modules.index('byKeywords').count('grunt', function(err, count) {
      if (err) return done(err);
      expect(count).equal(84);
      next();
    });

    modules.index('byMaintainers').count('tjholowaychuk', function(err, count) {
      if (err) return done(err);
      expect(count).equal(139);
      next();
    });
  });

  // compare with async find with timers
  it('find in set of ids', function(done) {
    var result = [];
    var next = runAfter(2, function() {
      expect(result[0].sort()).eql(result[1].sort());
      done();
    });

    console.time('find in');
    findIn(modules, ['async', 'request', 'component', 'bla-bla'], function(err, records) {
      if (err) return done(err);
      console.timeEnd('find in');
      expect(records).length(4);
      result.push(records);
      next();
    });

    modules.get = Promise.denodeify(modules.get);
    console.time('regular get');
    Promise.all([
      modules.get('async'),
      modules.get('request'),
      modules.get('component'),
      modules.get('bla-bla'),
    ]).then(function(records) {
      console.timeEnd('regular get');
      expect(records).length(4);
      result.push(records);
      next();
    }, done);
  });
});
