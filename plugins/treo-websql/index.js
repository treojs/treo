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
        if (index.multi) addMultiIndexSupport(db, index);
      });
    });
  };
}

/**
 * Patch `index` to support multi property with websql polyfill.
 *
 * @param {Index} index
 */

function addMultiIndexSupport(db, index) {
  index.get = function get(key, cb) {
    console.warn('treo-websql: multi index is enefficient!');
    var result = [];
    var r = db.constructor.range(key);

    this.store.cursor({ iterator: iterator }, function(err) {
      err ? cb(err) : cb(null, result);
    });

    function iterator(cursor) {
      var value = cursor.value;
      var field = value[index.field];
      if (!Array.isArray(field)) return cursor.continue();
      field.forEach(function(v) {
        if (((!r.lowerOpen && v >= r.lower) || (!r.lowerOpen && v > r.lower))
         && ((!r.upperOpen && v <= r.upper) || (!r.upperOpen && v < r.upper))) {
          result.push(value);
        }
      });
      cursor.continue();
    }
  };
}
