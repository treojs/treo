const parseRange = require('idb-range')
const request = require('idb-request')
const type = require('component-type')

/**
 * Expose `Index`.
 */

module.exports = Index

/**
 * Initialize new `Index`.
 *
 * @param {Store} store
 * @param {Object} opts { name, field, unique, multi }
 */

function Index(store, opts) {
  this.store = store
  this.name = opts.name
  this.field = opts.field
  this.multi = opts.multiEntry
  this.unique = opts.unique
}

/**
 * Get value by `key`.
 *
 * @param {Any} key
 * @return {Promise}
 */

Index.prototype.get = function(key) {
  return this.store._tr('read').then((tr) => {
    const index = tr.objectStore(this.store.name).index(this.name)
    return request(index.get(key))
  })
}

/**
 * Get all values matching `range`.
 *
 * @param {Any} [range]
 * @return {Promise}
 */

Index.prototype.getAll = function(range) {
  const result = []

  return this.cursor({ range, iterator }).then(function() {
    return result
  })

  function iterator(cursor) {
    result.push(cursor.value)
    cursor.continue()
  }
}

/**
 * Count records in `range`.
 *
 * @param {Any} range
 * @return {Promise}
 */

Index.prototype.count = function(range) {
  return this.store._tr('read').then((tr) => {
    const index = tr.objectStore(this.store.name).index(this.name)
    return request(index.count(parseRange(range)))
  })
}

/**
 * Create read cursor for specific `range`,
 * and pass IDBCursor to `iterator` function.
 *
 * @param {Object} opts { [range], [direction], iterator }
 * @return {Promise}
 */

Index.prototype.cursor = function({ range, direction, iterator }) {
  if (type(iterator) != 'function') throw new TypeError('iterator required')
  return this.store._tr('read').then((tr) => {
    const index = tr.objectStore(this.store.name).index(this.name)
    const req = index.openCursor(parseRange(range) || null, direction || 'next')
    return request(req, iterator)
  })
}
