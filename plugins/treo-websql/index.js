var isSupported = !! window.indexedDB;

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

  return function(db) {
    if (isSupported) return;
    // fix multi index support
    // https://github.com/axemclion/IndexedDBShim/issues/16
    Object.keys(db.stores).forEach(function(storeName) {
      var store = db.store(storeName);
      Object.keys(store.indexes).forEach(function(indexName) {
        var index = store.index(indexName);
        fixIndexSupport(db, index);
      });
    });
  };
}

/**
 * Patch `index` to support multi property with websql polyfill.
 *
 * @param {Index} index
 */

function fixIndexSupport(db, index) {
  index.get = function get(key, cb) {
    console.warn('treo-websql: index is enefficient');
    var result = [];
    var r = db.constructor.range(key);

    this.store.cursor({ iterator: iterator }, function(err) {
      err ? cb(err) : cb(null, index.unique ? result[0] : result);
    });

    function iterator(cursor) {
      var field = cursor.value[index.field];

      if (index.multi) {
        if (Array.isArray(field)) {
          field.forEach(function(v) { testValue(v, cursor) });
        }
      } else if (field !== undefined) {
        testValue(field, cursor);
      }

      cursor.continue();
    }

    function testValue(v, cursor) {
      if (((!r.lowerOpen && v >= r.lower) || (r.lowerOpen && v > r.lower)) && ((!r.upperOpen && v <= r.upper) || (r.upperOpen && v < r.upper))
        || (r.upper === undefined && ((!r.lowerOpen && v >= r.lower) || (r.lowerOpen && v > r.lower)))
        || (r.lower === undefined && ((!r.upperOpen && v <= r.upper) || (r.upperOpen && v < r.upper)))) {
        result.push(cursor.value);
      }
    }
  };

  index.count = function count(key, cb) {
    this.get(key, function(err, result) {
      err ? cb(err) : cb(null, index.unique && result ? 1 : result.length);
    });
  };
}
