var expect = require('chai').expect;
var Promise = require('promise');
var treo = require('../lib');
var websql = require('treo-websql');

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

    db = treo('npm', schema);
    db.use(websql());

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
      expect(count).equal(12);
      modules.index('byKeywords').count('grunt', function(err2, count) {
        expect(count).equal(9);
        modules.index('byMaintainers').count('tjholowaychuk', function(err3, count) {
          expect(count).equal(36);
          done(err || err2 || err3);
        });
      });
    });
  });

  it('works with promises', function(done) {
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
