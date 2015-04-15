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
 * @param {Treo} db
 * @param {Object} opts { name, keyPath, autoIncrement, indexes }
 */

function Store(db, opts) {
  this.db = db;
  this.name = opts.name;
  this.key = opts.keyPath;
  this.increment = opts.autoIncrement;
  this.indexes = {};
  opts.indexes.forEach(function(index) {
    this.indexes[index.name] = new Index(this, index);
  }, this);
}

/**
 * Get index by `name`.
 *
 * @param {String} name
 * @return {Index}
 */

Store.prototype.index = function(name) {
  return this.indexes[name];
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

  if (this.key && type(val) != 'undefined') {
    val[this.key] = key;
  } else if (this.key) {
    val = key;
  }

  return this.db.transaction([storeName], 'write').then(function(tr) {
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
  return this.db.transaction([storeName], 'read').then(function(tr) {
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
  return this.db.transaction([storeName], 'write').then(function(tr) {
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
  return this.db.transaction([storeName], 'read').then(function(tr) {
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
  return this.db.transaction([storeName], 'write').then(function(tr) {
    return request(tr.objectStore(storeName).clear());
  });
};

/**
 * Perform batch operation.
 *
 * @param {Object} vals
 * @return {Promise}
 */

Store.prototype.batch = function(ops) {
  var storeName = this.name;
  var keyPath = this.key;
  var keys = Object.keys(ops);

  return this.db.transaction([storeName], 'write').then(function(tr) {
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
 * https://developer.mozilla.org/en-US/docs/Web/API/IDBCursor
 *
 * @param {Object} opts:
 *   {IDBRange|Object} range - passes to .openCursor()
 *   {Function} iterator - function to call with IDBCursor
 *   {String} [index] - name of index to start cursor by index
 *   {String} [direction] - "prev", "prevunique", "next", "nextunique"
 * @return {Promise}
 */

Store.prototype.cursor = function(opts) {
  if (type(opts.iterator) != 'function') throw new TypeError('iterator required');
  var storeName = this.name;

  return this.db.transaction([storeName], 'read').then(function(tr) {
    var store = opts.index
      ? tr.objectStore(storeName).index(opts.index)
      : tr.objectStore(storeName);

    var req = opts.range
      ? store.openCursor(parseRange(opts.range), opts.direction || 'next')
      : store.openCursor(null, opts.direction || 'next');

    return request(req, opts.iterator);
  });
};
