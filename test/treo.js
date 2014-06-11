var expect = require('chai').expect;
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
  });
});
