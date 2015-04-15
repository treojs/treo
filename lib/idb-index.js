var parseRange = require('idb-range');
var request = require('idb-request');

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
  return this.store.db.transaction([storeName], 'read').then(function(tr) {
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
  return this.store.db.transaction([storeName], 'read').then(function(tr) {
    var index = tr.objectStore(storeName).index(indexName);
    return request(index.count(parseRange(range)));
  });
};

/**
 * Create cursor.
 * Proxy to `this.store` for convinience.
 *
 * @param {Object} opts
 * @return {Promise}
 */

Index.prototype.cursor = function(opts) {
  opts.index = this.name;
  return this.store.cursor(opts);
};
