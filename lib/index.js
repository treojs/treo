var type = require('type');

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
  if (that.unique && type(key) == 'object')
    throw new TypeError('ranges are not available for unique index');

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
      req = index.openCursor(parseRange(key));
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

/**
 * Parse key to valid range.
 * https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
 *
 * @param {Object|Any} key
 * @return {IDBKeyRange}
 */

function parseRange(key) {
  if (type(key) != 'object') return IDBKeyRange.only(key);
  var keys = Object.keys(key).sort();
  if (keys.length == 1) {
    var val = key[keys[0]];
    switch (keys[0]) {
      case 'gt':  return IDBKeyRange.lowerBound(val, true);
      case 'lt':  return IDBKeyRange.upperBound(val, true);
      case 'gte': return IDBKeyRange.lowerBound(val);
      case 'lte': return IDBKeyRange.upperBound(val);
    }
  } else {
    var x = key[keys[0]];
    var y = key[keys[1]];

    switch (keys[0] + '-' + keys[1]) {
      case 'gt-lt':   return IDBKeyRange.bound(x, y, true, true);
      case 'gt-lte':  return IDBKeyRange.bound(x, y, true, false);
      case 'gte-lt':  return IDBKeyRange.bound(x, y, false, true);
      case 'gte-lte': return IDBKeyRange.bound(x, y);
    }
  }
}
