var type = require('component-type');
var parseRange = require('idb-range');
var request = require('idb-request');
var Index = require('./idb-index');

/**
 * Expose `Store`.
 */

module.exports = Store;

/**
 * Initialize new `Store`.
 *
 * @param {Database} db
 * @param {Object} opts { name, keyPath, autoIncrement, indexes }
 */

function Store(db, opts) {
  this.db = db;
  this.tr = null;
  this.opts = opts.indexes;

  this.name = opts.name;
  this.key = opts.keyPath;
  this.increment = opts.autoIncrement;
  this.indexes = opts.indexes.map(function(index) { return index.name });
}

/**
 * Get index by `name`.
 *
 * @param {String} name
 * @return {Index}
 */

Store.prototype.index = function(name) {
  var index = this.indexes.indexOf(name);
  if (index == -1) throw new TypeError('invalid index name');
  return new Index(this, this.opts[index]);
};

/**
 * Put (create or replace) `key` to `val`.
 *
 * @param {Any} [key] is optional when store.key exists.
 * @param {Any} val
 * @return {Promise}
 */

Store.prototype.put = function(key, val) {
  var storeName = this.name;
  var keyPath = this.key;
  var tr = this.tr || this.db.transaction([storeName], 'write');

  if (this.key && type(val) != 'undefined') {
    val[this.key] = key;
  } else if (this.key) {
    val = key;
  }

  return tr.getInstance().then(function(tr) {
    var store = tr.objectStore(storeName);
    return request(keyPath ? store.put(val) : store.put(val, key), tr);
  });
};

/**
 * Get one value by `key`.
 *
 * @param {Any} key
 * @return {Promise}
 */

Store.prototype.get = function(key) {
  var storeName = this.name;
  var tr = this.tr || this.db.transaction([storeName], 'read');

  return tr.getInstance().then(function(tr) {
    return request(tr.objectStore(storeName).get(key));
  });
};

/**
 * Del value by `key`.
 *
 * @param {String} key
 * @return {Promise}
 */

Store.prototype.del = function(key) {
  var storeName = this.name;
  var tr = this.tr || this.db.transaction([storeName], 'write');

  return tr.getInstance().then(function(tr) {
    return request(tr.objectStore(storeName).delete(key));
  });
};

/**
 * Count.
 *
 * @param {Any} [range]
 * @return {Promise}
 */

Store.prototype.count = function(range) {
  var storeName = this.name;
  var tr = this.tr || this.db.transaction([storeName], 'read');

  return tr.getInstance().then(function(tr) {
    var store = tr.objectStore(storeName);
    return request(range ? store.count(parseRange(range)) : store.count());
  });
};

/**
 * Clear.
 *
 * @return {Promise}
 */

Store.prototype.clear = function() {
  var storeName = this.name;
  var tr = this.tr || this.db.transaction([storeName], 'write');

  return tr.getInstance().then(function(tr) {
    return request(tr.objectStore(storeName).clear());
  });
};

/**
 * Perform batch operation using `ops`.
 * Use `null` to delete key.
 *
 * {
 * 	 key1: 'val1', // put val1 to key1
 * 	 key2: 'val2', // put val2 to key2
 * 	 key3: null,   // delete key
 * }
 *
 * @param {Object} ops
 * @return {Promise}
 */

Store.prototype.batch = function(ops) {
  var storeName = this.name;
  var keyPath = this.key;
  var keys = Object.keys(ops);
  var tr = this.tr || this.db.transaction([storeName], 'write');

  return tr.getInstance().then(function(tr) {
    var store = tr.objectStore(storeName);
    var current = 0;

    // use raw callback API to avoid issues with transaction reuse
    return new request.Promise(function(resolve, reject) {
      tr.onerror = tr.onabort = reject;
      tr.oncomplete = function oncomplete() { resolve() };
      next();

      function next() {
        if (current >= keys.length) return;
        var currentKey = keys[current];
        var currentVal = ops[currentKey];
        var req;

        if (currentVal === null) {
          req = store.delete(currentKey);
        } else if (keyPath) {
          if (!currentVal[keyPath]) currentVal[keyPath] = currentKey;
          req = store.put(currentVal);
        } else {
          req = store.put(currentVal, currentKey);
        }

        req.onerror = reject;
        req.onsuccess = next;
        current += 1;
      }
    });
  });
};

/**
 * Get all.
 *
 * @param {Any} [range]
 * @return {Promise}
 */

Store.prototype.getAll = function(range) {
  var result = [];
  var opts = { iterator: iterator, range: range };

  return this.cursor(opts).then(function() {
    return result;
  });

  function iterator(cursor) {
    result.push(cursor.value);
    cursor.continue();
  }
};

/**
 * Create read cursor for specific `range`,
 * and pass IDBCursor to `iterator` function.
 *
 * @param {Object} opts:
 *   {Any} [range] - passes to .openCursor()
 *   {String} [direction] - "prev", "prevunique", "next", "nextunique"
 *   {Function} iterator - function to call with IDBCursor
 * @return {Promise}
 */

Store.prototype.cursor = function(opts) {
  if (type(opts.iterator) != 'function') throw new TypeError('iterator required');
  var storeName = this.name;
  var tr = this.tr || this.db.transaction([storeName], 'read');

  return tr.getInstance().then(function(tr) {
    var store = tr.objectStore(storeName);
    var req = store.openCursor(parseRange(opts.range) || null, opts.direction || 'next');
    return request(req, opts.iterator);
  });
};
