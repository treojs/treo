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

    if (type(key) == 'object') {
      cb = val;
      console.log('batch', key, cb);
    } else {
      var req = objectStore.put(val, key);
      req.onerror = cb;
      tr.onerror = cb;
      tr.oncomplete = function oncomplete() { cb() };
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
  var name = this.name;
  this.db.getInstance(function(err, db) {
    if (err) return cb(err);
    var tr = db.transaction([name], 'readonly');
    var objectStore = tr.objectStore(name);

    if (type(key) == 'array') {
      console.log('batch get', cb);
    } else {
      var req = objectStore.get(key);
      req.onerror = cb;
      req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
    }
  });
};
