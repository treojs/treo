var parseRange = require('idb-range');
var request = require('idb-request');
var type = require('component-type');

/**
 * Expose `Index`.
 */

module.exports = Index;

/**
 * Initialize new `Index`.
 *
 * @param {Store} store
 * @param {Object} opts { name, field, unique, multi }
 */

function Index(store, opts) {
  this.store = store;
  this.name = opts.name;
  this.field = opts.field;
  this.multi = opts.multiEntry;
  this.unique = opts.unique;
}

/**
 * Get value by `key`.
 *
 * @param {Any} key
 * @return {Promise}
 */

Index.prototype.get = function(key) {
  var indexName = this.name;
  var storeName = this.store.name;
  var tr = this.store.tr || this.store.db.transaction([storeName], 'read');

  return tr.getInstance().then(function(tr) {
    var index = tr.objectStore(storeName).index(indexName);
    return request(index.get(key));
  });
};

/**
 * Get all values matching `range`.
 *
 * @param {Any} [range]
 * @return {Promise}
 */

Index.prototype.getAll = function(range) {
  var result = [];
  var opts = { range: range, iterator: iterator };

  return this.cursor(opts).then(function() {
    return result;
  });

  function iterator(cursor) {
    result.push(cursor.value);
    cursor.continue();
  }
};

/**
 * Count records in `range`.
 *
 * @param {Any} range
 * @return {Promise}
 */

Index.prototype.count = function(range) {
  var indexName = this.name;
  var storeName = this.store.name;
  var tr = this.store.tr || this.store.db.transaction([storeName], 'read');

  return tr.getInstance().then(function(tr) {
    var index = tr.objectStore(storeName).index(indexName);
    return request(index.count(parseRange(range)));
  });
};

/**
 * Create read cursor for specific `range`,
 * and pass IDBCursor to `iterator` function.
 *
 * @param {Object} opts { [range], [direction], iterator }
 * @return {Promise}
 */

Index.prototype.cursor = function(opts) {
  if (type(opts.iterator) != 'function') throw new TypeError('iterator required');
  var storeName = this.store.name;
  var indexName = this.name;
  var tr = this.store.tr || this.store.db.transaction([storeName], 'read');

  return tr.getInstance().then(function(tr) {
    var index = tr.objectStore(storeName).index(indexName);
    var req = index.openCursor(parseRange(opts.range) || null, opts.direction || 'next');
    return request(req, opts.iterator);
  });
};
