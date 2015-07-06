var parseRange = require('idb-range')
var request = require('idb-request')
var type = require('component-type')

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
  var self = this
  return this.store._tr('read').then(function(tr) {
    var index = tr.objectStore(self.store.name).index(self.name)
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
  var result = []

  return this.cursor({ range: range, iterator: iterator }).then(function() {
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
  var self = this
  return this.store._tr('read').then(function(tr) {
    // HACK: use cursor, because IndexedDBShim does not support range as argument:
    // https://github.com/axemclion/IndexedDBShim/issues/202
    if (type(global.shimIndexedDB) != 'undefined') {
      return self.getAll(range).then(function(all) {
        return all.length
      })
    } else {
      var index = tr.objectStore(self.store.name).index(self.name)
      return request(index.count(parseRange(range)))
    }
  })
}

/**
 * Create read cursor for specific `range`,
 * and pass IDBCursor to `iterator` function.
 *
 * @param {Object} opts { [range], [direction], iterator }
 * @return {Promise}
 */

Index.prototype.cursor = function(opts) {
  if (type(opts.iterator) != 'function') throw new TypeError('opts.iterator required')
  var self = this

  // HACK: IndexedDBShim does not work properly with this option,
  // this fix probably has bugs with multiEntry items
  // https://github.com/axemclion/IndexedDBShim/issues/204
  if (opts.direction == 'prevunique' && type(global.shimIndexedDB) != 'undefined') {
    return this.store._tr('read').then(function(tr) {
      var index = tr.objectStore(self.store.name).index(self.name)
      var req = index.openCursor(parseRange(opts.range), self.multi ? 'nextunique' : 'prev')
      var keys = {} // count unique keys

      return request(req, iterator)

      function iterator(cursor) {
        if (!keys[cursor.key]) {
          keys[cursor.key] = true
          opts.iterator(cursor)
        } else {
          cursor.continue()
        }
      }
    })
  } else {
    return this.store._tr('read').then(function(tr) {
      var index = tr.objectStore(self.store.name).index(self.name)
      var req = index.openCursor(parseRange(opts.range), opts.direction || 'next')
      return request(req, opts.iterator)
    })
  }
}
