var type = require('type');
var asyncEach = require('async-each');

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
  this.indexes = [];
  this.db = null;
}

/**
 * Put (create or replace) `key` to `val`.
 *
 * @param {Any|Object} key
 * @param {Any} val
 * @param {Function} cb
 */

Store.prototype.put = function(key, val, cb) {
  var name = this.name;
  this.db.getInstance(function(err, db) {
    if (err) return cb(err);
    var tr = db.transaction([name], 'readwrite');
    var objectStore = tr.objectStore(name);

    if (type(key) != 'object') {
      var req = objectStore.put(val, key);
      req.onerror = cb;
    } else {
      cb = val;
      var keys = Object.keys(key);
      var vals = key;
      var current = 0;
      var next = function() {
        if (current >= keys.length) return;
        var currentKey = keys[current];
        var currentVal = vals[currentKey];

        var req = currentVal === null
          ? objectStore.del(currentKey)
          : objectStore.put(currentVal, currentKey);

        req.onerror = cb;
        req.onsuccess = next;
        current += 1;
      };
      next();
    }

    tr.onerror = cb;
    tr.oncomplete = function oncomplete() { cb() };
  });
};

/**
 * Get `key`.
 *
 * @param {Any|Array} key
 * @param {Function} cb
 */

Store.prototype.get = function(key, cb) {
  var name = this.name;
  var get = this.get.bind(this);

  this.db.getInstance(function(err, db) {
    if (err) return cb(err);
    var tr = db.transaction([name], 'readonly');
    var objectStore = tr.objectStore(name);

    if (type(key) == 'array') {
      asyncEach(key, get, cb);
    } else {
      var req = objectStore.get(key);
      req.onerror = cb;
      req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
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
  var name = this.name;
  var keys = type(key) == 'array' ? key : [key];

  this.db.getInstance(function(err, db) {
    if (err) return cb(err);
    var tr = db.transaction([name], 'readwrite');
    var objectStore = tr.objectStore(name);

    var current = 0;
    var next = function() {
      if (current >= keys.length) return;
      var req = objectStore.delete(keys[current]);
      req.onerror = cb;
      req.onsuccess = next;
      current += 1;
    };
    next();

    tr.onerror = cb;
    tr.oncomplete = function oncomplete() { cb() };
  });
};

/**
 * Count.
 *
 * @param {Function} cb
 */

Store.prototype.count = function(cb) {
  var name = this.name;
  this.db.getInstance(function(err, db) {
    if (err) return cb(err);
    var tr = db.transaction([name], 'readonly');
    var objectStore = tr.objectStore(name);

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
  var name = this.name;
  this.db.getInstance(function(err, db) {
    if (err) return cb(err);
    var tr = db.transaction([name], 'readwrite');
    var objectStore = tr.objectStore(name);

    var req = objectStore.clear();
    req.onerror = cb;
    tr.onerror = cb;
    tr.oncomplete = function oncomplete() { cb() };
  });
};
