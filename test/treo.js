if (!window.indexedDB) require('./vendor/indexeddb-shim');
var expect = require('chai').expect;
var after = require('after');
var treo = require('../lib');

describe('treo', function() {
  var db;
  var schema = treo.schema()
    .version(1)
      .addStore('books')
      .addIndex('byTitle', 'title', { unique: true })
      .addIndex('byAuthor', 'author')
    .version(2)
      .getStore('books')
      .addIndex('byYear', 'year')
    .version(3)
      .addStore('magazines')
      .addIndex('byPublisher', 'publisher')
      .addIndex('byFrequency', 'frequency');

  var IDBKeyRange = window.IDBKeyRange
    || window.webkitIDBKeyRange
    || window.msIDBKeyRange;

  beforeEach(function() {
    db = treo('treo', schema);
  });

  afterEach(function(done) {
    db.drop(done);
  });

  describe('db', function() {
    it('has properties', function() {
      expect(db.name).equal('treo');
      expect(db.version).equal(3);
      expect(db.status).equal('close');
      expect(Object.keys(db.stores)).length(2);
    });

    it('parallel read', function(done) {
      var next = after(3, done);
      db.store('books').count(next);
      db.store('magazines').count(next);
      db.store('magazines').index('byPublisher').get(1, next);
    });

    it('parallel write', function(done) {
      var books = db.store('books');
      var magazines = db.store('magazines');
      var next = after(4, function() {
        books.all(function(err, records) {
          expect(records).length(3);
          magazines.count(function(err2, count) {
            expect(count).equal(1);
            done(err || err2);
          });
        });
      });

      books.batch({ 1: { id: 1, name: 'book 1' }, 2: { id: 2, name: 'book 2' } }, next);
      books.put(3, { id: 3, name: 'book 3' }, next);
      magazines.del(5, next);
      magazines.put(4, { message: 'hey' }, next);
    });

    it('advanced schema', function(done) {
      var upgradedSchema = schema
        .version(4)
          .addStore('authors')
        .version(5)
          .getStore('authors')
          .addIndex('byName', 'name', { unique: true });

      db = treo('treo', upgradedSchema);
      expect(db.version).equal(5);
      expect(Object.keys(db.stores)).length(3);
      var authors = db.store('authors');

      authors.batch({
        1: { id: 1, name: 'Fred' },
        2: { id: 2, name: 'Barney' },
      }, function(err) {
        if (err) return done(err);
        db.store('authors').all(function(err, all) {
          if (err) return done(err);
          expect(all).length(2);
          db.store('authors').index('byName').get('Fred', function(err, fred) {
            expect(fred.id).equal(1);
            done(err);
          });
        });
      });
    });
  });

  describe('store', function() {
    it('has properties', function() {
      var books = db.store('books');
      expect(books.name).equal('books');
      expect(books.db).equal(db);
      expect(Object.keys(books.indexes)).length(3);
    });

    it('#put', function(done) {
      var attrs = { title: 'Quarry Memories', author: 'Fred', isbn: 123456 };
      var books = db.store('books');

      books.put(attrs.isbn, attrs, function(err) {
        if (err) return done(err);
        books.get(attrs.isbn, function(err, book) {
          if (err) return done(err);
          expect(book).eql(attrs);
          done();
        });
      });
    });

    it('#clear', function(done) {
      var books = db.store('books');
      books.batch({
        '123456': { title: 'Quarry Memories', author: 'Fred', isbn: '123456' },
        '234567': { title: 'Water Buffaloes', author: 'Fred', isbn: '234567' },
      }, function(err) {
        books.count(function(err2, count) {
          expect(count).equal(2);
          books.clear(function(err3) {
            books.count(function(err4, count) {
              expect(count).equal(0);
              done(err || err2 || err3 || err4);
            });
          });
        });
      });
    });

    it('#del', function(done) {
      var magazines = db.store('magazines');
      magazines.batch({
        'id1': { title: 'Quarry Memories', id: 'id1', publisher: 'Bob' },
        'id2': { title: 'Water Buffaloes', id: 'id2', publisher: 'Bob' },
        'id3': { title: 'Bedrocky Nights', id: 'id3', publisher: 'Tim' },
        'id4': { title: 'Heavy weighting', id: 'id4', publisher: 'Ken' },
      }, function(err) {
        if (err) return done(err);
        magazines.del('id1', function(err) {
          if (err) return done(err);
          magazines.count(function(err, count) {
            expect(count).equal(3);
            done(err);
          });
        });
      });
    });

    it('#all', function(done) {
      var magazines = db.store('magazines');
      magazines.batch({
        'id1': { title: 'Quarry Memories', id: 'id1', publisher: 'Bob' },
        'id2': { title: 'Water Buffaloes', id: 'id2', publisher: 'Bob' },
        'id3': { title: 'Bedrocky Nights', id: 'id3', publisher: 'Tim' },
        'id4': { title: 'Waving wings', id: 'id4', publisher: 'Ken' },
      }, function(err) {
        if (err) return done(err);

        magazines.all(function(err, result) {
          expect(result).length(4);
          expect(result[0].id).equal('id1');
          done(err);
        });
      });
    });

    it('#batch', function(done) {
      var magazines = db.store('magazines');
      magazines.batch({
        'id1': { title: 'Quarry Memories', id: 'id1', publisher: 'Bob' },
        'id2': { title: 'Water Buffaloes', id: 'id2', publisher: 'Bob' },
      }, function(err) {
        if (err) return done(err);
        magazines.batch({
          'id1': null,
          'id3': { title: 'Bedrocky Nights', id: 'id3', publisher: 'Tim' },
          'id4': { title: 'Heavy Weighting', id: 'id4', publisher: 'Ken' },
          'id2': null,
        }, function(err) {
          if (err) return done(err);
          magazines.count(function(err, count) {
            expect(count).equal(2);
            done(err);
          });
        });
      });
    });
  });

  describe('index', function() {
    var books;

    beforeEach(function(done) {
      books = db.store('books');
      books.batch({
        1: { title: 'Quarry Memories', author: 'Fred', isbn: 1, year: 2012 },
        2: { title: 'Water Buffaloes', author: 'Fred', isbn: 2, year: 2013 },
        3: { title: 'Bedrock Nights', author: 'Barney', isbn: 3, year: 2012 },
      }, done);
    });

    it('has properties', function() {
      var byAuthor = books.index('byAuthor');
      expect(byAuthor.name).equal('byAuthor');
      expect(byAuthor.unique).false;
      expect(byAuthor.multi).false;
      expect(byAuthor.field).equal('author');
      expect(byAuthor.store).equal(books);
    });

    it('#get by array index', function(done) {
      books.index('byAuthor').get('Fred', function(err, records) {
        if (err) return done(err);
        expect(records).length(2);
        expect(records[0].isbn).equal(1);

        books.index('byYear').get(2013, function(err, records) {
          expect(records).length(1);
          expect(records[0].isbn).equal(2);
          done(err);
        });
      });
    });

    it('accepts IDBKeyRange object', function(done) {
      var next = after(2, done);
      var range1 = IDBKeyRange.lowerBound(2012); // >= 2012
      var range2 = IDBKeyRange.bound(2012, 2013, true, false); // > 2012 <= 2013

      books.index('byYear').get(range1, function(err, all) {
        expect(all).length(3);
        next(err);
      });

      books.index('byYear').get(range2, function(err, all) {
        expect(all).length(1);
        next(err);
      });
    });

    it('#get by unique index', function(done) {
      books.index('byTitle').get('Bedrock Nights', function(err, val) {
        if (err) return done(err);
        expect(val.isbn).equal(3);
        expect(val.title).equal('Bedrock Nights');
        expect(Object.keys(val)).length(4);
        done();
      });
    });

    it('#count', function(done) {
      var next = after(3, done);

      books.index('byYear').count(2012, function(err, count) {
        expect(count).equal(2);
        next(err);
      });

      books.index('byTitle').count('Water Buffaloes', function(err, count) {
        expect(count).equal(1);
        next(err);
      });

      var range = IDBKeyRange.bound('Fr', 'Fr\uffff', false, false);
      books.index('byAuthor').count(range, function(err, count) {
        expect(count).equal(2);
        next(err);
      });
    });
  });
});
