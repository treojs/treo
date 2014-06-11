var expect = require('chai').expect;
var treo = require('../lib/treo');

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
      expect(db.stores).length(2);
      expect(db.status).equal('close');
    });
  });

  describe('store', function() {
    it('has properties', function() {
      var books = db.store('books');
      expect(books.name).equal('books');
      expect(books.indexes).length(3);
      expect(books.db).equal(db);
    });

    it('#put one record', function(done) {
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

    it('#put many record in batch', function(done) {
      var books = db.store('books');
      books.put({
        '123456': { title: 'Quarry Memories', author: 'Fred', isbn: '123456' },
        '234567': { title: 'Water Buffaloes', author: 'Fred', isbn: '234567' },
        '345678': { title: 'Bedrock Nights', author: 'Barney', isbn: '345678' },
      }, function(err) {
        if (err) return done(err);
        books.get(['123456', '234567'], function(err, records) {
          if (err) return done(err);
          expect(records).length(2);
          expect(records[0].isbn).equal('123456');
          done();
        });
      });
    });

    it('#clear', function(done) {
      var books = db.store('books');
      books.put({
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

    it('#del many records', function(done) {
      var magazines = db.store('magazines');
      magazines.put({
        'id1': { title: 'Quarry Memories', id: 'id1', publisher: 'Bob' },
        'id2': { title: 'Water Buffaloes', id: 'id2', publisher: 'Bob' },
        'id3': { title: 'Bedrocky Nights', id: 'id3', publisher: 'Tim' },
        'id4': { title: 'Heavy weighting', id: 'id4', publisher: 'Ken' },
      }, function(err) {
        if (err) return done(err);
        magazines.del('id1', function(err) {
          if (err) return done(err);
          magazines.del(['id1', 'id2', 'id3'], function(err) {
            if (err) return done(err);
            magazines.count(function(err, count) {
              expect(count).equal(1);
              done(err);
            });
          });
        });
      });
    });
  });
});
