
/**
 * Cache stores descriptors.
 */

const cache = Object.create(null)

/**
 * Get store descriptor.
 *
 * @param {IDBDatabase} db
 * @param {String} storeName
 * @return {Object}
 */

export function storeDescriptor(db, storeName) {
  if (!cache[db.name]) cache[db.name] = Object.create(null)
  if (!cache[db.name][db.version]) cache[db.name][db.version] = Object.create(null)
  if (!cache[db.name][db.version][storeName]) {
    const store = db.transaction(storeName, 'readonly').objectStore(storeName)
    const indexes = {}
    toArray(store.indexNames).map((indexName) => {
      const index = store.index(indexName)
      indexes[indexName] = {
        name: indexName,
        keyPath: index.keyPath,
        unique: index.unique,
        multiEntry: index.multiEntry,
      }
    })
    cache[db.name][db.version][storeName] = {
      name: storeName,
      keyPath: store.keyPath,
      autoIncrement: store.autoIncrement,
      indexes,
    }
  }
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

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function toArray(arrayLike) {
  return [].slice.call(arrayLike)
}
