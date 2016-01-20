
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
        keyPath: getKeyPath(index.keyPath),
        unique: index.unique,
        multiEntry: index.multiEntry || false,
      }
    })
    cache[db.name][db.version][storeName] = {
      name: storeName,
      keyPath: store.keyPath,
      autoIncrement: store.autoIncrement, // does not work in IE
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

/**
 * Compound keys in IE.
 */

const compoundKeysPropertyName = '__$$compoundKey'
const keySeparator = '$_$'
const propertySeparatorRegExp = /\$\$/g

function decodeCompoundKeyPath(keyPath) {
  // Remove the "__$$compoundKey." prefix
  keyPath = keyPath.substr(compoundKeysPropertyName.length + 1)

  // Split the properties into an array
  // "name$$first$_$name$$last" ==> ["name$$first", "name$$last"]
  keyPath = keyPath.split(keySeparator)

  // Decode dotted properties
  // ["name$$first", "name$$last"] ==> ["name.first", "name.last"]
  for (let i = 0; i < keyPath.length; i++) {
    keyPath[i] = keyPath[i].replace(propertySeparatorRegExp, '.')
  }
  return keyPath
}

function getKeyPath(keyPath) {
  if (keyPath instanceof global.DOMStringList) { // Safari
    return [].slice.call(keyPath)
  } else if (keyPath.indexOf(compoundKeysPropertyName) !== -1) { // Shim
    return decodeCompoundKeyPath(keyPath)
  }
  return keyPath
}
