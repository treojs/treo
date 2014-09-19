var type = require('component-type');
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
        if (index.multi) fixIndexSupport(db, index);
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
    if (r.upper === undefined) r.upper = '\uffff';
    if (r.lower === undefined) r.lower = '\uffff';

    this.store.cursor({ iterator: iterator }, function(err) {
      err ? cb(err) : cb(null, result);
    });

    function iterator(cursor) {
      var field = cursor.value[index.field];

      if (Array.isArray(field)) {
        field.forEach(function(v) {
          if (((!r.lowerOpen && v >= r.lower) || (r.lowerOpen && v > r.lower))
           && ((!r.upperOpen && v <= r.upper) || (r.upperOpen && v < r.upper))) {
            result.push(cursor.value);
          }
        });
      }

      cursor.continue();
    }
  };

  index.count = function count(key, cb) {
    this.get(key, function(err, result) {
      err ? cb(err) : cb(null, result.length);
    });
  };
}
