var parseRange = require('idb-range');
var isSafari = typeof window.openDatabase !== 'undefined' &&
    /Safari/.test(navigator.userAgent) &&
    !/Chrome/.test(navigator.userAgent);

var isSupported = !isSafari && !! window.indexedDB;

/**
 * Expose `plugin()`.
 */

module.exports = plugin;

/**
 * Create websql polyfill based on:
 * https://github.com/axemclion/IndexedDBShim
 * And fix some polyfill's bugs as:
 *   - multi index support
 *
 * @return {Function}
 */

function plugin() {
  if (!isSupported) require('./indexeddb-shim');

  return function(db, treo) {
    if (isSupported) return;
    // fix multi index support
    // https://github.com/axemclion/IndexedDBShim/issues/16
    Object.keys(db.stores).forEach(function(storeName) {
      var store = db.store(storeName);
      Object.keys(store.indexes).forEach(function(indexName) {
        var index = store.index(indexName);
        fixIndexSupport(treo, index);
      });
    });
  };
}

/**
 * Patch `index` to support multi property with websql polyfill.
 *
 * @param {Index} index
 */

function fixIndexSupport(treo, index) {
  index.get = function get(key, cb) {
    console.warn('treo-websql: index is enefficient');
    var result = [];
    var r = parseRange(key);

    this.store.cursor({ iterator: iterator }, function(err) {
      err ? cb(err) : cb(null, index.unique ? result[0] : result);
    });

    function iterator(cursor) {
      var field;
      if (Array.isArray(index.field)) {
        field = index.field.map(function(field) {
          return cursor.value[field];
        });
      } else {
        field = cursor.value[index.field];
      }
      if (index.multi) {
        if (Array.isArray(field)) {
          field.forEach(function(v) {
            if (testValue(v)) result.push(cursor.value);
          });
        }
      } else if (field !== undefined) {
        if (testValue(field)) result.push(cursor.value);
      }
      cursor.continue();
    }

    function testValue(v) {
      return (((!r.lowerOpen && v >= r.lower) || (r.lowerOpen && v > r.lower)) && ((!r.upperOpen && v <= r.upper) || (r.upperOpen && v < r.upper))
        || (r.upper === undefined && ((!r.lowerOpen && v >= r.lower) || (r.lowerOpen && v > r.lower)))
        || (r.lower === undefined && ((!r.upperOpen && v <= r.upper) || (r.upperOpen && v < r.upper))));
    }
  };

  index.count = function count(key, cb) {
    this.get(key, function(err, result) {
      err ? cb(err) : cb(null, index.unique && result ? 1 : result.length);
    });
  };
}
