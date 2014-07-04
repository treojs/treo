var treo = require('treo');

/**
 * Efficient way to get bunch of records by `keys`.
 *
 * Examples:
 *
 *   var books = db.store('books');
 *   findIn(books, ['book-1', 'book-2', 'book-n'], fn);
 *
 *   var byAuthor = books.index('byAuthor');
 *   findIn(byAuthor, ['Fred', 'Barney'], fn);
 *
 * SQL equivalent:
 *
 *   SELECT * FROM BOOKS WHERE ID IN ('book-1', 'book-2', 'book-n')
 *   SELECT * FROM BOOKS WHERE AUTHOR IN ('Fred', 'Barney')
 *
 * @param {Store|Index} store - target store
 * @param {Array} keys
 * @param {Function} cb - cb(err, result)
 */

module.exports = function findIn(store, keys, cb) {
  var result = [];
  var current = 0;
  keys = keys.sort(treo.cmp);

  store.cursor({ iterator: iterator }, done);

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
