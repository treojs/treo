
/**
 * Expose `Index`.
 */

module.exports = Index;

/**
 * `IDBKeyRange` reference.
 */

var IDBKeyRange = window.IDBKeyRange
  || window.webkitIDBKeyRange
  || window.msIDBKeyRange;

/**
 * Initialize new `Index`.
 *
 * @param {name} String
 */

function Index(store, name, field, opts) {
  this.store = store;
  this.store.indexes[name] = this;
  this.name = name;
  this.field = field;
  this.unique = opts.unique;
}

/**
 * Get `key`.
 */

Index.prototype.get = function(key, cb) {
  var that = this;
  this.store.transaction('readonly', function(err, tr, store) {
    if (err) return cb(err);
    var index = store.index(that.name);
    var result = [];
    var req;

    if (that.unique) {
      req = index.get(key);
      req.onerror = cb;
      req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
    } else {
      key = key instanceof IDBKeyRange ? key : IDBKeyRange.only(key);
      req = index.openCursor(key);
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
    }
  });
};

/**
 * Count records by `key`.
 *
 * @param {Any} key
 * @param {Function} cb
 */

Index.prototype.count = function(key, cb) {
  var that = this;

  this.store.transaction('readonly', function(err, tr, store) {
    if (err) return cb(err);
    var index = store.index(that.name);
    var req = index.count(key);
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};
