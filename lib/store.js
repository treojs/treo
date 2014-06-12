var type = require('type');

/**
 * Expose `Store`.
 */

module.exports = Store;

/**
 * Initialize new `Store`.
 *
 * @param {name} String
 */

function Store(name) {
  this.name = name;
  this.indexes = {};
  this.db = null;
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
 * @param {Any|Object} key
 * @param {Any} val
 * @param {Function} cb
 */

Store.prototype.put = function(key, val, cb) {
  var keys, vals;
  if (type(key) != 'object') {
    keys = [key];
    vals = {};
    vals[key] = val;
  } else {
    keys = Object.keys(key);
    vals = key;
    cb = val;
  }

  this.transaction('readwrite', function(err, tr, objectStore) {
    if (err) return cb(err);
    var current = 0;
    tr.onerror = tr.onabort = cb;
    tr.oncomplete = function oncomplete() { cb() };
    next();

    function next() {
      if (current >= keys.length) return;
      var currentKey = keys[current];
      var currentVal = vals[currentKey];

      var req = currentVal === null
        ? objectStore.del(currentKey)
        : objectStore.put(currentVal, currentKey);

      req.onerror = cb;
      req.onsuccess = next;
      current += 1;
    }
  });
};

/**
 * Get `key`.
 *
 * @param {Any|Array} key
 * @param {Function} cb
 */

Store.prototype.get = function(key, cb) {
  var keys = type(key) == 'array' ? key : [key];

  this.transaction('readonly', function(err, tr, objectStore) {
    if (err) return cb(err);
    var result = [];
    var current = 0;
    next();

    function next() {
      if (current >= keys.length) return;
      var req = objectStore.get(keys[current]);
      current += 1;
      req.onerror = cb;
      req.onsuccess = function onsuccess(e) {
        if (type(key) != 'array') return cb(null, e.target.result);
        result.push(e.target.result);
        current == keys.length ? cb(null, result) : next();
      };
    }
  });
};

/**
 * Del `key`.
 *
 * @param {Any|Array} key
 * @param {Function} cb
 */

Store.prototype.del = function(key, cb) {
  var keys = type(key) == 'array' ? key : [key];

  this.transaction('readwrite', function(err, tr, objectStore) {
    if (err) return cb(err);
    var current = 0;
    tr.onerror = tr.onabort = cb;
    tr.oncomplete = function oncomplete() { cb() };
    next();

    function next() {
      if (current >= keys.length) return;
      var req = objectStore.delete(keys[current]);
      req.onerror = cb;
      req.onsuccess = next;
      current += 1;
    }
  });
};

/**
 * Count.
 *
 * @param {Function} cb
 */

Store.prototype.count = function(cb) {
  this.transaction('readonly', function(err, tr, objectStore) {
    if (err) return cb(err);
    var req = objectStore.count();
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

/**
 * Clear.
 *
 * @param {Function} cb
 */

Store.prototype.clear = function(cb) {
  this.transaction('readwrite', function(err, tr, objectStore) {
    if (err) return cb(err);
    var req = objectStore.clear();
    tr.onerror = tr.onabort = req.onerror = cb;
    tr.oncomplete = function oncomplete() { cb() };
  });
};

/**
 * Get all.
 *
 * @param {Function} cb
 */

Store.prototype.all = function(cb) {
  this.transaction('readonly', function(err, tr, objectStore) {
    if (err) return cb(err);
    var result = [];
    var req = objectStore.openCursor();
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        result.push(cursor.value);
        cursor.continue();
      } else {
        cb(null, result);
      }
    };
  });
};

/**
 * Create new transaction.
 *
 * @param {Function} cb
 */

Store.prototype.transaction = function(type, cb) {
  var name = this.name;
  this.db.getInstance(function(err, db) {
    if (err) return cb(err);
    var tr = db.transaction([name], type);
    var store = tr.objectStore(name);
    cb(null, tr, store);
  });
};
