const type = require('component-type')
const parseRange = require('idb-range')
const request = require('idb-request')
const Index = require('./idb-index')

/**
 * Expose `Store`.
 */

module.exports = Store

/**
 * Initialize new `Store`.
 *
 * @param {Database} db
 * @param {Transaction} tr
 * @param {Object} opts { name, keyPath, autoIncrement, indexes }
 */

function Store(db, tr, opts) {
  this.db = db
  this.tr = tr
  this.opts = opts.indexes
  this.name = opts.name
  this.key = opts.keyPath
  this.increment = opts.autoIncrement
  this.indexes = opts.indexes.map((index) => index.name)
}

/**
 * Get index by `name`.
 *
 * @param {String} name
 * @return {Index}
 */

Store.prototype.index = function(name) {
  const i = this.indexes.indexOf(name)
  if (i == -1) throw new TypeError('invalid index name')
  return new Index(this, this.opts[i])
}

/**
 * Put (create or replace) `key` to `val`.
 *
 * @param {Any} [key] is optional when store.key exists.
 * @param {Any} val
 * @return {Promise}
 */

Store.prototype.put = function(key, val) {
  if (this.key && type(val) != 'undefined') {
    val[this.key] = key
  } else if (this.key) {
    val = key
  }
  return this._tr('write').then((tr) => {
    const store = tr.objectStore(this.name)
    return request(this.key ? store.put(val) : store.put(val, key), tr)
  })
}

/**
 * Get one value by `key`.
 *
 * @param {Any} key
 * @return {Promise}
 */

Store.prototype.get = function(key) {
  return this._tr('read').then((tr) => {
    return request(tr.objectStore(this.name).get(key))
  })
}

/**
 * Del value by `key`.
 *
 * @param {String} key
 * @return {Promise}
 */

Store.prototype.del = function(key) {
  return this._tr('write').then((tr) => {
    return request(tr.objectStore(this.name).delete(key))
  })
}

/**
 * Count.
 *
 * @param {Any} [range]
 * @return {Promise}
 */

Store.prototype.count = function(range) {
  return this._tr('read').then((tr) => {
    const store = tr.objectStore(this.name)
    return request(range ? store.count(parseRange(range)) : store.count())
  })
}

/**
 * Clear.
 *
 * @return {Promise}
 */

Store.prototype.clear = function() {
  return this._tr('write').then((tr) => {
    return request(tr.objectStore(this.name).clear())
  })
}

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
 * @param {Object} ops
 * @return {Promise}
 */

Store.prototype.batch = function(ops) {
  const keys = Object.keys(ops)
  const keyPath = this.key

  return this._tr('write').then((tr) => {
    return new request.Promise(function(resolve, reject) {
      const store = tr.objectStore(this.name)
      let current = 0

      tr.onerror = tr.onabort = reject
      tr.oncomplete = () => resolve()
      next()

      function next() {
        if (current >= keys.length) return
        const currentKey = keys[current]
        const currentVal = ops[currentKey]
        let req

        if (currentVal === null) {
          req = store.delete(currentKey)
        } else if (keyPath) {
          if (!currentVal[keyPath]) currentVal[keyPath] = currentKey
          req = store.put(currentVal)
        } else {
          req = store.put(currentVal, currentKey)
        }

        req.onerror = reject
        req.onsuccess = next
        current += 1
      }
    })
  })
}

/**
 * Get all.
 *
 * @param {Any} [range]
 * @return {Promise}
 */

Store.prototype.getAll = function(range) {
  const result = []

  return this.cursor({ iterator, range }).then(function() {
    return result
  })

  function iterator(cursor) {
    result.push(cursor.value)
    cursor.continue()
  }
}

/**
 * Create read cursor for specific `range`,
 * and pass IDBCursor to `iterator` function.
 *
 * @param {Object} opts:
 *   {Any} [range] - passes to .openCursor()
 *   {String} [direction] - "prev", "prevunique", "next", "nextunique"
 *   {Function} iterator - function to call with IDBCursor
 * @return {Promise}
 */

Store.prototype.cursor = function({ range, direction, iterator }) {
  if (type(iterator) != 'function') throw new TypeError('iterator required')
  return this._tr('read').then((tr) => {
    const store = tr.objectStore(this.name)
    const req = store.openCursor(parseRange(range) || null, direction || 'next')
    return request(req, iterator)
  })
}

/**
 * Shortcut to create or reuse transaction.
 *
 * @param {String} mode
 * @return {Transaction}
 * @api private
 */

Store.prototype._tr = function(mode) {
  return this.tr || this.db.transaction([this.name], mode)
}
