
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
 * @param {Store} store
 * @param {String} name
 * @param {String} field
 * @param {Object} opts { unique: false, multi: false }
 */

function Index(store, name, field, opts) {
  this.store = store;
  this.store.indexes[name] = this;
  this.name = name;
  this.field = field;
  this.multi = opts.multi || false;
  this.unique = opts.unique || false;
}

/**
 * Get `key`.
 *
 * @param {String|IDBRange} key
 * @param {Function} cb
 */

Index.prototype.get = function(key, cb) {
  var result = [];
  var that = this;
  var range = key instanceof IDBKeyRange ? key : IDBKeyRange.only(key);

  this.cursor(range, iterator, function(err) {
    if (err) return cb(err);
    that.unique && !(key instanceof IDBKeyRange)
      ? cb(null, result[0])
      : cb(null, result);
  });

  function iterator(cursor) {
    result.push(cursor.value);
    cursor.continue();
  }
};

/**
 * Count records by `key`.
 *
 * @param {String|IDBRange} key
 * @param {Function} cb
 */

Index.prototype.count = function(key, cb) {
  var name = this.store.name;
  var that = this;

  this.store.db.transaction('readonly', [name], function(err, tr) {
    if (err) return cb(err);
    var index = tr.objectStore(name).index(that.name);
    var req = index.count(key);
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

/**
 * Create read cursor.
 *
 * @param {IDBRange} range
 * @param {Function} iterator
 * @param {Function} cb
 */

Index.prototype.cursor = function(range, iterator, cb) {
  var name = this.store.name;
  var that = this;

  this.store.db.transaction('readonly', [name], function(err, tr) {
    if (err) return cb(err);
    var index = tr.objectStore(name).index(that.name);
    var req = index.openCursor(range);
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) {
      var cursor = e.target.result;
      cursor ? iterator(cursor) : cb();
    };
  });
};
