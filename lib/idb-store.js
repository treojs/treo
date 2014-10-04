var type = require('component-type');
var parseRange = require('./range');

/**
 * Expose `Store`.
 */

module.exports = Store;

/**
 * Initialize new `Store`.
 *
 * @param {String} name
 * @param {Object} opts
 */

function Store(name, opts) {
  this.db = null;
  this.name = name;
  this.indexes = {};
  this.key = opts.key || opts.keyPath || undefined;
  this.increment = opts.increment || opts.autoIncretement || undefined;
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
 * @param {String|Object} [key] is optional when store.key exists.
 * @param {Any} val
 * @param {Function} [cb]
 */

Store.prototype.put = function(key, val, cb) {
  if (this.key) {
    if (type(key) == 'object') {
      cb = val;
      val = key;
      key = null;
    } else {
      val[this.key] = key;
    }
  }

  this.getInstance('readwrite', function(store) {
    return this.key ? store.put(val) : store.put(val, key);
  }, cb);
};

/**
 * Get `key`.
 *
 * @param {String} key
 * @param {Function} cb
 */

Store.prototype.get = function(key, cb) {
  this.getInstance('readonly', function(store) {
    var req = store.get(key);
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  }, cb);
};

/**
 * Del `key`.
 *
 * @param {String} key
 * @param {Function} [cb]
 */

Store.prototype.del = function(key, cb) {
  this.getInstance('readwrite', function(store) {
    return store.delete(key);
  }, cb);
};

/**
 * Count.
 *
 * @param {Function} cb
 */

Store.prototype.count = function(cb) {
  this.getInstance('readonly', function(store) {
    var req = store.count();
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  }, cb);
};

/**
 * Clear.
 *
 * @param {Function} [cb]
 */

Store.prototype.clear = function(cb) {
  this.getInstance('readwrite', function(store) {
    return store.clear();
  }, cb);
};

/**
 * Perform batch operation.
 *
 * @param {Object} vals
 * @param {Function} [cb]
 */

Store.prototype.batch = function(vals, cb) {
  var keys = Object.keys(vals);
  var keyPath = this.key;

  this.getInstance('readwrite', function(store) {
    var current = 0;
    next();
    return true;

    function next() {
      if (current >= keys.length) return;
      var currentKey = keys[current];
      var currentVal = vals[currentKey];
      var req;

      if (currentVal === null) {
        req = store.delete(currentKey);
      } else if (keyPath) {
        if (!currentVal[keyPath]) currentVal[keyPath] = currentKey;
        req = store.put(currentVal);
      } else {
        req = store.put(currentVal, currentKey);
      }

      req.onerror = cb;
      req.onsuccess = next;
      current += 1;
    }
  }, cb);
};

/**
 * Get all.
 *
 * @param {Function} cb
 */

Store.prototype.all = function(cb) {
  var result = [];

  this.cursor({ iterator: iterator }, function(err) {
    err ? cb(err) : cb(null, result);
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
 * @param {Function} cb - calls on end or error
 */

Store.prototype.cursor = function(opts, cb) {
  this.getInstance('readonly', function(store) {
    var obj = opts.index ? store.index(opts.index) : store;
    var req = obj.openCursor(parseRange(opts.range));

    req.onerror = cb;
    req.onsuccess = function onsuccess(e) {
      var cursor = e.target.result;
      cursor ? opts.iterator(cursor) : cb();
    };
  }, cb);
};

/**
 * Create transaction and return IDBStore.
 * It abstracts logic of initializing new transaction and handle errors.
 *
 * @param {String} type
 * @param {Function} fn(store) - IDBStore instance
 * @param {Function} cb(err)
 */

Store.prototype.getInstance = function(type, fn, cb) {
  if (!cb) cb = function noob() {};

  if (this.activeTransaction) {
    fn.call(this, this.activeTransaction.objectStore(this.name));
  } else {
    var that = this;
    this.db.transaction(type, [this.name], function(tr) {
      var req = fn.call(that, tr.objectStore(that.name));
      if (req && cb) {
        req.onerror = cb;
        tr.hasComplete = true; // say call `cb`
      }
    }, cb);
  }
};

/**
 * Set `activeTransaction` to reuse it in `this.getInstance`.
 *
 * @param {IDBTransaction} tr
 */

Store.prototype.setTransaction = function(tr) {
  this.activeTransaction = tr;
  this.activeTransaction.hasComplete = true; // enable complete `cb`

  tr.addEventListener('complete', reset);
  tr.addEventListener('error', reset);
  tr.addEventListener('block', reset);

  var that = this;
  function reset() { delete that.activeTransaction }
};
