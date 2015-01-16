// Example of simple treo plugin, which can be used as:
//
// var db = treo('library', schema)
//   .use(require('./find-in-plugin'));
//
// Treo ships with 2 plugins, and you can check them for more examples.

module.exports = function plugin() {
  return function(db, treo) {
    var Index = treo.Index;
    var Store = treo.Store;

    /**
     * Efficient way to get bunch of records by `keys`.
     * Inspired by: https://hacks.mozilla.org/2014/06/breaking-the-borders-of-indexeddb/
     *
     * Examples:
     *
     *   var books = db.store('books');
     *   books.findIn(['book-1', 'book-2', 'book-n'], fn);
     *
     *   var byAuthor = books.index('byAuthor');
     *   byAuthor.findIn(['Fred', 'Barney'], fn);
     *
     * SQL equivalent:
     *
     *   SELECT * FROM BOOKS WHERE ID IN ('book-1', 'book-2', 'book-n')
     *   SELECT * FROM BOOKS WHERE AUTHOR IN ('Fred', 'Barney')
     *
     * @param {Array} keys
     * @param {Function} cb - cb(err, result)
     */

    Index.prototype.findIn =
    Store.prototype.findIn = function(keys, cb) {
      var result = [];
      var current = 0;
      keys = keys.sort(treo.cmp);

      this.cursor({ iterator: iterator }, done);

      function iterator(cursor) {
        if (current > keys.length) return done();
        if (cursor.key > keys[current]) {
          result.push(undefined); // key not found
          current += 1;
          cursor.continue(keys[current]);
        } else if (cursor.key === keys[current]) {
          result.push(cursor.value); // key found
          current += 1;
          cursor.continue(keys[current]);
        } else {
          cursor.continue(keys[current]); // go to next key
        }
      }

      function done(err) {
        err ? cb(err) : cb(null, result);
      }
    };
  };
};
