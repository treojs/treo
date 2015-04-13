var expect = require('chai').expect;
var after = require('after');
var treo = require('../lib');
var websql = require('treo-websql');

describe('treo', function() {
  var db, schema;

  beforeEach(function() {
    schema = treo.schema()
    .version(1)
      .addStore('books')
      .addIndex('byTitle', 'title', { unique: true })
      .addIndex('byAuthor', 'author')
      .addIndex('byTitleAndAuthor', ['title', 'author'], { unique: true })
      .addStore('locals')
    .version(2)
      .getStore('books')
      .addIndex('byYear', 'year')
    .version(3)
      .addStore('magazines', { key: 'id' })
      .addIndex('byPublisher', 'publisher')
      .addIndex('byFrequency', 'frequency')
      .addIndex('byWords', 'words', { multi: true });
    db = treo('treo', schema).use(websql());
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

    it('drop stores', function(done) {
      var delSchema = treo.schema()
        .version(1)
          .addStore('books')
          .addIndex('byTitle', 'title', { unique: true })
          .addIndex('byAuthor', 'author')
          .addStore('locals')
        .version(2)
          .addStore('magazines', { key: 'id' })
          .addIndex('byWords', 'words', { multi: true });

      var db = treo('treo', delSchema).use(websql());
      db.store('magazines').put({ id: 4, words: ['hey'] }, function(err) {
        if (err) return done(err);
        db.close(function() {
          delSchema = delSchema.version(3)
            .delStore('books')
            .getStore('magazines')
            .delIndex('byWords');
          var db = treo('treo', delSchema).use(websql());
          expect(Object.keys(db.stores)).length(2);
          expect(Object.keys(db.store('magazines').indexes)).length(0);

          db.store('magazines').get(4, function(err, obj) {
            if (err) return done(err);
            expect(obj).eql({ id: 4, words: ['hey'] });
            db.drop(done);
          });
        });
      });
    });

    it('handlew onversionchange automatically', function(done) {
      db.store('magazines').put({ id: 4, words: ['hey'] }, function(err) {
        if (err) return done(err);
        var newSchema = schema.version(4).addStore('users');
        var newDb = treo('treo', newSchema).use(websql());
        newDb.store('users').put(1, { name: 'Jon' }, function(err, key) {
          if (err) return done(err);
          expect(key).equal(1);

          newDb.store('magazines').get(4, function(err, obj) {
            if (err) return done(err);
            expect(obj).eql({ id: 4, words: ['hey'] });
            done();
          });
        });
      });
    });
  });

  describe('store', function() {
    it('has properties', function() {
      var books = db.store('books');
      var magazines = db.store('magazines');
      expect(books.name).equal('books');
      expect(books.db).equal(db);
      expect(Object.keys(books.indexes)).length(4);
      expect(magazines.key).equal('id');
    });

    it('#put', function(done) {
      var attrs = { title: 'Quarry Memories', author: 'Fred', isbn: 123456 };
      var books = db.store('books');
      var magazines = db.store('magazines');
      var next = after(2, done);

      books.put(attrs.isbn, attrs, function(err, key) {
        if (err) return done(err);
        expect(key).equal(123456);
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
        123456: { title: 'Quarry Memories', author: 'Fred', isbn: '123456' },
        234567: { title: 'Water Buffaloes', author: 'Fred', isbn: '234567' },
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
        id1: { title: 'Quarry Memories', publisher: 'Bob' },
        id2: { title: 'Water Buffaloes', publisher: 'Bob' },
        id3: { title: 'Bedrocky Nights', publisher: 'Tim' },
        id4: { title: 'Heavy weighting', publisher: 'Ken' },
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
      magazines.batch([
        { id: 'id1', title: 'Quarry Memories', publisher: 'Bob' },
        { id: 'id2', title: 'Water Buffaloes', publisher: 'Bob' },
        { id: 'id3', title: 'Bedrocky Nights', publisher: 'Tim' },
        { id: 'id4', title: 'Waving Wings', publisher: 'Ken' },
      ], function(err) {
        if (err) return done(err);

        magazines.all(function(err, result) {
          expect(result).length(4);
          expect(result[0].id).equal('id1');

          magazines.all({ gt: 'id2' }, function(err2, result) {
            expect(result).length(2);
            expect(result[0].id).equal('id3');
            done(err || err2);
          });
        });
      });
    });

    it('#batch', function(done) {
      var magazines = db.store('magazines');
      magazines.batch({
        id1: { title: 'Quarry Memories', publisher: 'Bob' },
        id2: { title: 'Water Buffaloes', publisher: 'Bob' },
      }, function(err) {
        if (err) return done(err);
        magazines.batch({
          id1: null,
          id3: { title: 'Bedrocky Nights', publisher: 'Tim' },
          id4: { title: 'Heavy Weighting', publisher: 'Ken' },
          id2: null,
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

    it('#get with object params', function(done) {
      books.index('byYear').get({ gte: 2012 }, function(err, all) {
        expect(all).length(3);

        books.index('byYear').get({ gt: 2012, lte: 2013 }, function(err, all) {
          expect(all).length(1);
          done(err);
        });
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
      books.index('byYear').count(2012, function(err, count) {
        if (err) return done(err);
        expect(count).equal(2);

        books.index('byTitle').count('Water Buffaloes', function(err, count) {
          if (err) return done(err);
          expect(count).equal(1);
          done();
        });
      });
    });

    it('multi index', function(done) {
      var magazines = db.store('magazines');
      magazines.batch({
        id1: { title: 'Quarry Memories', words: ['quarry', 'memories'] },
        id2: { title: 'Water Bad Fellows', words: ['water', 'bad', 'fellows'] },
        id3: { title: 'Badrocky Nights', words: ['badrocky', 'nights'] },
        id4: { title: 'Waving Wings', words: ['waving', 'wings'] },
      }, function(err) {
        if (err) return done(err);
        var next = after(2, done);

        magazines.index('byWords').get({ gte: 'bad', lte: 'bad\uffff' }, function(err, result) {
          expect(result).length(2);
          expect(result[0].id).equal('id2');
          next(err);
        });

        magazines.index('byWords').get({ gte: 'w', lte: 'w\uffff' }, function(err, result) {
          expect(result).length(3);
          expect(result[1].id).equal('id4');
          expect(result[2].id).equal('id4');
          next(err);
        });
      });
    });

    it('compound multi-field index', function(done) {
      books.index('byTitleAndAuthor').get(['Quarry Memories', 'Fred'], function(err, record) {
        if (err) return done(err);
        expect(record).exist;
        expect(record.isbn).equal(1);
        done();
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
