
/**
 * Link to array prototype method.
 */

const slice = [].slice

/**
 * Cache stores descriptors using [db][version] notation.
 * Since database structure does not change between versions.
 */

const cache = {}

/**
 * Get store descriptor.
 *
 * @param {IDBDatabase} db
 * @param {String} storeName
 * @return {Object}
 */

export function storeDescriptor(db, storeName) {
  if (!cache[db.name]) cache[db.name] = {}
  if (!cache[db.name][db.version]) cache[db.name][db.version] = {}
  if (!cache[db.name][db.version][storeName]) {
    const store = db.transaction(storeName, 'readonly').objectStore(storeName)
    const indexes = {}
    slice.call(store.indexNames).forEach((indexName) => {
      const index = store.index(indexName)
      indexes[indexName] = {
        name: indexName,
        keyPath: index.keyPath,
        unique: index.unique,
        multiEntry: index.multiEntry || false,
      }
    })
    cache[db.name][db.version][storeName] = {
      name: storeName,
      keyPath: store.keyPath,
      autoIncrement: store.autoIncrement || false,
      indexes,
    }
  }
  // clone data to avoid external cache modification
  return clone(cache[db.name][db.version][storeName])
}

/**
 * Get index descriptor.
 *
 * @param {IDBDatabase} db
 * @param {String} storeName
 * @param {String} indexName
 * @return {Object}
 */

export function indexDescriptor(db, storeName, indexName) {
  return storeDescriptor(db, storeName).indexes[indexName]
}

/**
 * Naive clone implementaion.
 *
 * @param {Object} obj
 * @return {Object}
 */

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}
