import isPlainObj from 'is-plain-obj'
const isSafari = /Version\/[\d\.]+.*Safari/.test(navigator.userAgent)
const slice = [].slice
const map = [].map

/**
 * Perform batch operation using `ops`.
 * It uses raw callback API to avoid issues with transaction reuse.
 *
 * {
 * 	 key1: 'val1', // put val1 to key1
 * 	 key2: 'val2', // put val2 to key2
 * 	 key3: null,   // delete key
 * }
 *
 * @param {Object|Array} ops
 * @return {Promise}
 */

export default function batch(db, storeName, ops) {
  if (isPlainObj(ops)) {
    ops = Object.keys(ops).map((key) => {
      return { key, value: ops[key], type: ops[key] === null ? 'del' : 'put' }
    })
  }

  ops.forEach((op) => {
    if (['add', 'put', 'del'].indexOf(op.type) === -1) throw new TypeError(`invalid "${op.type}"`)
    if (!op.key) throw new TypeError('key is required')
  })

  return new Promise((resolve, reject) => {
    const tr = db.transaction(storeName, 'readwrite')
    const store = tr.objectStore(storeName)
    const results = []
    let currentIndex = 0

    tr.onerror = tr.onabort = handleError(reject)
    tr.oncomplete = () => resolve(results)
    next()

    function next() {
      const { type, key } = ops[currentIndex]
      if (type === 'del') return request(store.delete(key))

      let val = ops[currentIndex].val || ops[currentIndex].value

      if (store.keyPath) {
        if (typeof val !== 'undefined') {
          val[store.keyPath] = key
        } else {
          val = key
        }
      }

      countUniqueIndexes(store, val, (err, uniqueRecordsCounter) => {
        if (err) return reject(err)
        if (uniqueRecordsCounter) return reject(new Error('Unique index ConstraintError'))
        request(store.keyPath ? store[type](val) : store[type](val, key))
      })
    }

    function request(req) {
      currentIndex += 1

      req.onerror = handleError(reject)
      req.onsuccess = (e) => {
        results.push(e.target.result)
        if (currentIndex < ops.length) next()
      }
    }
  })
}

/**
 * Validate unique index manually.
 *
 * Fixing:
 * - https://bugs.webkit.org/show_bug.cgi?id=149107
 * - https://github.com/axemclion/IndexedDBShim/issues/56
 *
 * @param {IDBStore} store
 * @param {Any} val
 * @param {Function} cb(err, uniqueRecordsCounter)
 */

function countUniqueIndexes(store, val, cb) {
  // try to rely on native support
  if (!isSafari && global.indexedDB !== global.shimIndexedDB) return cb()

  const indexes = slice.call(store.indexNames).map((indexName) => {
    const index = store.index(indexName)
    const indexVal = isCompound(index)
    ? map.call(index.keyPath, (indexKey) => val[indexKey]).filter((v) => Boolean(v))
    : val[index.keyPath]

    return [ index, indexVal ]
  }).filter(([ index, indexVal ]) => {
    return index.unique && (isCompound(index) ? indexVal.length : indexVal)
  })

  if (!indexes.length) return cb()

  let totalRequestsCounter = indexes.length
  let uniqueRecordsCounter = 0

  indexes.forEach(([ index, indexVal ]) => {
    const req = index.getKey(indexVal)
    req.onerror = handleError(cb)
    req.onsuccess = (e) => {
      if (e.target.result) uniqueRecordsCounter += 1
      totalRequestsCounter -= 1
      if (totalRequestsCounter === 0) cb(null, uniqueRecordsCounter)
    }
  })
}

/**
 * Check if `index` is compound
 *
 * @param {IDBIndex} index
 * @return {Boolean}
 */

function isCompound(index) {
  return typeof index.keyPath !== 'string'
}

/**
 * Create error handler.
 *
 * @param {Function} cb
 * @return {Function}
 */

function handleError(cb) {
  return (e) => {
    // prevent global error throw https://bugzilla.mozilla.org/show_bug.cgi?id=872873
    if (typeof e.preventDefault === 'function') e.preventDefault()
    cb(e.target.error)
  }
}
