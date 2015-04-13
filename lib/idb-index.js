var parseRange = require('idb-range');

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
 * @param {Function} cb
 */

Index.prototype.get = function(key, cb) {
  var name = this.store.name;
  var indexName = this.name;

  this.store.db.transaction([name], 'read', function(err, tr) {
    if (err) return cb(err);
    var index = tr.objectStore(name).index(indexName);
    var req = index.get(key);
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

/**
 * Get all values matching `range`.
 *
 * @param {Object|IDBKeyRange} [range]
 * @param {Function} cb
 */

Index.prototype.getAll = function(range, cb) {
  var result = [];
  var opts = { range: range, iterator: iterator };

  this.cursor(opts, function(err) {
    if (err) return cb(err);
    cb(null, result);
  });

  function iterator(cursor) {
    result.push(cursor.value);
    cursor.continue();
  }
};

/**
 * Count records by `range`.
 *
 * @param {String|IDBKeyRange} range
 * @param {Function} cb
 */

Index.prototype.count = function(range, cb) {
  var name = this.store.name;
  var indexName = this.name;

  this.store.db.transaction([name], 'read', function(err, tr) {
    if (err) return cb(err);
    var index = tr.objectStore(name).index(indexName);
    var req = index.count(parseRange(range));
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

/**
 * Create cursor.
 * Proxy to `this.store` for convinience.
 *
 * @param {Object} opts
 * @param {Function} cb
 */

Index.prototype.cursor = function(opts, cb) {
  opts.index = this.name;
  this.store.cursor(opts, cb);
};
