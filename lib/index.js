
/**
 * Expose `Index`.
 */

module.exports = Index;

/**
 * Link to `IDBKeyRange`
 */

var IDBKeyRange = window.IDBKeyRange
  || window.mozIDBKeyRange
  || window.webkitIDBKeyRange;

/**
 * Initialize new `Index`.
 *
 * @param {name} String
 */

function Index(store, name, field, opts) {
  this.store = store;
  this.store.indexes.push(this);
  this.name = name;
  this.field = field;
  this.unique = opts.unique;
}

/**
 * Get `key`.
 */

Index.prototype.get = function(key, cb) {
  var name = this.store.name;
  var that = this;

  this.store.db.getInstance(function(err, db) {
    if (err) return cb(err);
    var tr = db.transaction([name], 'readonly');
    var index = tr.objectStore(name).index(that.name);
    var result = [];
    var req;

    if (that.unique) {
      req = index.get(key);
      req.onerror = cb;
      req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
    } else {
      req = index.openCursor(IDBKeyRange.only(key));
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
 * Return name with store prefix.
 *
 * @return {String}
 */

Index.prototype.fullName = function() {
  return this.store.name + '-' + this.name;
};
