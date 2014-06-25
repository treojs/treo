if (!window.indexedDB) require('./vendor/indexeddb-shim');
var expect = require('chai').expect;
var after = require('after');
var treo = require('../lib');
var IDBKeyRange = window.IDBKeyRange
  || window.webkitIDBKeyRange
  || window.msIDBKeyRange;

describe('treo', function() {
  var db, schema;

  schema = treo.schema()
    .version(1)
      .addStore('books')
      .addIndex('byTitle', 'title', { unique: true })
      .addIndex('byAuthor', 'author')
      .addStore('locals')
    .version(2)
      .getStore('books')
      .addIndex('byYear', 'year')
    .version(3)
      .addStore('magazines', { key: 'id' })
      .addIndex('byPublisher', 'publisher')
      .addIndex('byFrequency', 'frequency')
      .addIndex('byWords', 'words', { multi: true });

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
      expect(Object.keys(db.stores)).length(3);
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

      books.batch({ 1: { name: 'book 1' }, 2: { id: 2, name: 'book 2' } }, next);
      books.put(3, { id: 3, name: 'book 3' }, next);
      magazines.del(5, next);
      magazines.put({ id: 4, message: 'hey' }, next);
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
      var magazines = db.store('magazines');
      var next = after(2, done);

      books.put(attrs.isbn, attrs, function(err) {
        if (err) return done(err);
        books.get(attrs.isbn, function(err, book) {
          if (err) return done(err);
          expect(book).eql(attrs);
          next();
        });
      });

      magazines.put('id1', { name: 'new magazine' }, function(err) {
        if (err) return done(err);
        magazines.get('id1', function(err, magazine) {
          if (err) return done(err);
          expect(magazine.id).eql('id1');
          next();
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
        'id1': { title: 'Quarry Memories', publisher: 'Bob' },
        'id2': { title: 'Water Buffaloes', publisher: 'Bob' },
        'id3': { title: 'Bedrocky Nights', publisher: 'Tim' },
        'id4': { title: 'Heavy weighting', publisher: 'Ken' },
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
        'id1': { title: 'Quarry Memories', publisher: 'Bob' },
        'id2': { title: 'Water Buffaloes', publisher: 'Bob' },
        'id3': { title: 'Bedrocky Nights', publisher: 'Tim' },
        'id4': { title: 'Waving Wings', publisher: 'Ken' },
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
        'id1': { title: 'Quarry Memories', publisher: 'Bob' },
        'id2': { title: 'Water Buffaloes', publisher: 'Bob' },
      }, function(err) {
        if (err) return done(err);
        magazines.batch({
          'id1': null,
          'id3': { title: 'Bedrocky Nights', publisher: 'Tim' },
          'id4': { title: 'Heavy Weighting', publisher: 'Ken' },
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

    it('#get by not unique index', function(done) {
      books.index('byAuthor').get(IDBKeyRange.only('Fred'), function(err, records) {
        if (err) return done(err);
        expect(records).length(2);
        expect(records[0].isbn).equal(1);

        books.index('byYear').get(IDBKeyRange.only(2013), function(err, records) {
          expect(records).length(1);
          expect(records[0].isbn).equal(2);
          done(err);
        });
      });
    });

    it('#get with IDBKeyRange param', function(done) {
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
      var next = after(2, done);

      books.index('byYear').count(2012, function(err, count) {
        expect(count).equal(2);
        next(err);
      });

      books.index('byTitle').count('Water Buffaloes', function(err, count) {
        expect(count).equal(1);
        next(err);
      });
    });

    it('multi index', function(done) {
      // https://github.com/axemclion/IndexedDBShim/issues/16
      if (window.shimIndexedDB) return done();

      var magazines = db.store('magazines');
      magazines.batch({
        'id1': { title: 'Quarry Memories', words: ['quarry', 'memories'] },
        'id2': { title: 'Water Bad Fellows', words: ['water', 'bad', 'fellows'] },
        'id3': { title: 'Badrocky Nights', words: ['badrocky', 'nights'] },
        'id4': { title: 'Waving Wings', words: ['waving', 'wings'] },
      }, function(err) {
        if (err) return done(err);
        var range1 = IDBKeyRange.bound('bad', 'bad\uffff', false, false); // bad*
        var range2 = IDBKeyRange.bound('w', 'w\uffff', false, false); // w*
        var next = after(2, done);

        magazines.index('byWords').get(range1, function(err, result) {
          expect(result).length(2);
          expect(result[0].id).equal('id2');
          next(err);
        });

        magazines.index('byWords').get(range2, function(err, result) {
          expect(result).length(3);
          expect(result[1].id).equal('id4');
          expect(result[2].id).equal('id4');
          next(err);
        });
      });
    });
  });

  describe('non objects', function() {
    it('#put val to key', function(done) {
      var locals = db.store('locals');
      locals.put('foo', 'bar', function(err) {
        if (err) return done(err);
        locals.get('foo', function(err, val) {
          expect(val).equal('bar');
          done(err);
        });
      });
    });

    it('#batch many records', function(done) {
      var locals = db.store('locals');
      locals.batch({
        foo: 'val 1',
        bar: 'val 2',
        baz: 'val 3',
      }, function(err) {
        if (err) return done(err);
        var next = after(3, done);

        locals.get('bar', function(err, val) {
          expect(val).equal('val 2');
          next(err);
        });

        locals.count(function(err, count) {
          expect(count).equal(3);
          next(err);
        });

        locals.get('fake', function(err, val) {
          expect(val).not.exist;
          next(err);
        });
      });
    });
  });
});
