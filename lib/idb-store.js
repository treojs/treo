var type = require('component-type')
var parseRange = require('idb-range')
var request = require('idb-request')
var Index = require('./idb-index')

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
  this.indexes = opts.indexes.map(function(index) { return index.name })
}

/**
 * Get index by `name`.
 *
 * @param {String} name
 * @return {Index}
 */

Store.prototype.index = function(name) {
  var i = this.indexes.indexOf(name)
  if (i == -1) throw new TypeError('invalid index name')
  return new Index(this, this.opts[i])
}

/**
 * Put (create or replace) `val` to `key`.
 *
 * @param {Any} [key] is optional when store.key exists.
 * @param {Any} val
 * @return {Promise}
 */

Store.prototype.put = function(key, val) {
  var self = this
  if (this.key && type(val) != 'undefined') {
    val[this.key] = key
  } else if (this.key) {
    val = key
  }
  return this._tr('write').then(function(tr) {
    var store = tr.objectStore(self.name)
    return request(self.key ? store.put(val) : store.put(val, key), tr)
  })
}

/**
 * Add `val` to `key`.
 *
 * @param {Any} [key] is optional when store.key exists.
 * @param {Any} val
 * @return {Promise}
 */

Store.prototype.add = function(key, val) {
  var self = this
  if (this.key && type(val) != 'undefined') {
    val[this.key] = key
  } else if (this.key) {
    val = key
  }
  return this._tr('write').then(function(tr) {
    var store = tr.objectStore(self.name)
    return request(self.key ? store.add(val) : store.add(val, key), tr)
  })
}

/**
 * Get one value by `key`.
 *
 * @param {Any} key
 * @return {Promise}
 */

Store.prototype.get = function(key) {
  var self = this
  return this._tr('read').then(function(tr) {
    return request(tr.objectStore(self.name).get(key))
  })
}

/**
 * Del value by `key`.
 *
 * @param {String} key
 * @return {Promise}
 */

Store.prototype.del = function(key) {
  var self = this
  return this._tr('write').then(function(tr) {
    return request(tr.objectStore(self.name).delete(key))
  })
}

/**
 * Count.
 *
 * @param {Any} [range]
 * @return {Promise}
 */

Store.prototype.count = function(range) {
  var self = this
  return this._tr('read').then(function(tr) {
    var store = tr.objectStore(self.name)
    return request(range ? store.count(parseRange(range)) : store.count())
  })
}

/**
 * Clear.
 *
 * @return {Promise}
 */

Store.prototype.clear = function() {
  var self = this
  return this._tr('write').then(function(tr) {
    return request(tr.objectStore(self.name).clear())
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
  var self = this
  var keys = Object.keys(ops)

  return this._tr('write').then(function(tr) {
    return new request.Promise(function(resolve, reject) {
      var store = tr.objectStore(self.name)
      var current = 0

      tr.onerror = tr.onabort = reject
      tr.oncomplete = function() { resolve() }
      next()

      function next() {
        if (current >= keys.length) return
        var currentKey = keys[current]
        var currentVal = ops[currentKey]
        var req

        if (currentVal === null) {
          req = store.delete(currentKey)
        } else if (self.key) {
          if (!currentVal[self.key]) currentVal[self.key] = currentKey
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
  var result = []

  return this.cursor({ iterator: iterator, range: range }).then(function() {
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

Store.prototype.cursor = function(opts) {
  if (type(opts.iterator) != 'function') throw new TypeError('iterator required')
  var self = this
  return this._tr('read').then(function(tr) {
    var store = tr.objectStore(self.name)
    var req = store.openCursor(parseRange(opts.range) || null, opts.direction || 'next')
    return request(req, opts.iterator)
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
  return (this.tr || this.db.transaction([this.name], mode)).getInstance()
}
