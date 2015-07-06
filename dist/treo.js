(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.treo = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var Emitter = require('component-emitter')
var type = require('component-type')
var Schema = require('idb-schema')
var request = require('idb-request')
var Transaction = require('./idb-transaction')
var Store = require('./idb-store')

/**
 * Expose `Database`.
 */

module.exports = Database

/**
 * Initialize new `Database` instance.
 *
 * @param {String} name
 * @param {Schema} schema
 */

function Database(name, schema) {
  if (!(this instanceof Database)) return new Database(name, schema)
  if (type(name) != 'string') throw new TypeError('`name` required')
  if (!(schema instanceof Schema)) throw new TypeError('not valid schema')

  this.status = 'close'
  this.origin = null
  this.schema = schema
  this.opts = schema.stores()
  this.name = name
  this.version = schema.version()
  this.stores = this.opts.map(function(store) { return store.name })
}

/**
 * Inherit from `Emitter`.
 */

Emitter(Database.prototype)

/**
 * Use plugin `fn`.
 *
 * @param {Function} fn
 * @return {Database}
 */

Database.prototype.use = function(fn) {
  fn(this, require('./index')) // cycle reference
  return this
}

/**
 * Close connection && delete database.
 * After close it waits a little to avoid exception in Safari.
 *
 * @return {Promise}
 */

Database.prototype.del = function() {
  var idb = global.indexedDB || global.webkitIndexedDB
  var self = this
  return this.close().then(function() {
    return new request.Promise(function(resolve) {
      setTimeout(resolve, 50)
    }).then(function() {
      return request(idb.deleteDatabase(self.name))
    })
  })
}

/**
 * Close database.
 *
 * @return {Promise}
 */

Database.prototype.close = function() {
  if (this.status == 'close') return request.Promise.resolve()
  var self = this
  return this.getInstance().then(function(db) {
    db.close()
    self.removeAllListeners()
    self.origin = null
    self.status = 'close'
  })
}

/**
 * Get store by `name`.
 *
 * @param {String} name
 * @param {Transaction} [tr]
 * @return {Store}
 */

Database.prototype.store = function(name, tr) {
  var i = this.stores.indexOf(name)
  if (i == -1) throw new TypeError('invalid store name')
  return new Store(this, tr, this.opts[i])
}

/**
 * Create new transaction for selected `scope`.
 *
 * @param {Array} scope - follow indexeddb semantic
 * @param {String} [mode] - readonly|readwrite or read|write
 * @return {Transaction}
 */

Database.prototype.transaction = function(scope, mode) {
  if (!mode) mode = 'readonly'
  else if (mode == 'read') mode = 'readonly'
  else if (mode == 'write') mode = 'readwrite'
  return new Transaction(this, scope, mode)
}

/**
 * Get raw db instance.
 * It initiates opening transaction only once,
 * another requests will be fired on "open" event.
 *
 * @return {Promise} (IDBDatabase)
 */

Database.prototype.getInstance = function() {
  if (this.status == 'open') return request.Promise.resolve(this.origin)
  if (this.status == 'error') return new Error('database error')
  if (this.status == 'opening') return this.promise
  var self = this

  this.status = 'opening'
  this.promise = new request.Promise(function(resolve, reject) {
    var idb = global.indexedDB || global.webkitIndexedDB
    var req = idb.open(self.name, self.version)

    req.onupgradeneeded = self.schema.callback()
    req.onerror = req.onblocked = function(e) {
      delete self.promise
      self.status = 'error'
      reject(e)
    }
    req.onsuccess = function(e) {
      var db = e.target.result
      delete self.promise
      self.status = 'open'
      self.origin = db
      db.onerror = function(e) { self.emit('error', e) }
      db.onabort = function() { self.emit('abort') }
      db.onclose = function() { self.emit('close') }
      db.onversionchange = function(e) {
        self.emit('versionchange', e)
        self.close().catch(function(e) { self.emit('error', e) }) // default handler
      }
      resolve(db)
    }
  })

  return this.promise
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./idb-store":3,"./idb-transaction":4,"./index":5,"component-emitter":6,"component-type":7,"idb-request":9,"idb-schema":10}],2:[function(require,module,exports){
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
    var index = tr.objectStore(self.store.name).index(self.name)
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

Index.prototype.cursor = function(opts) {
  if (type(opts.iterator) != 'function') throw new TypeError('opts.iterator required')
  var self = this
  return this.store._tr('read').then(function(tr) {
    var index = tr.objectStore(self.store.name).index(self.name)
    var req = index.openCursor(parseRange(opts.range), opts.direction || 'next')
    return request(req, opts.iterator)
  })
}

},{"component-type":7,"idb-range":8,"idb-request":9}],3:[function(require,module,exports){
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
    return request(tr.objectStore(self.name).count(parseRange(range)))
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
    var req = store.openCursor(parseRange(opts.range), opts.direction || 'next')
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

},{"./idb-index":2,"component-type":7,"idb-range":8,"idb-request":9}],4:[function(require,module,exports){
var Emitter = require('component-emitter')
var request = require('idb-request')

/**
 * Expose `Transaction`.
 */

module.exports = Transaction

/**
 * Initialize new `Transaction`.
 *
 * @param {Database} db
 * @param {Array} scope
 * @param {String} mode
 */

function Transaction(db, scope, mode) {
  var self = this
  this.db = db
  this.origin = null
  this.status = 'close'
  this.scope = scope
  this.mode = mode
  this.promise = new request.Promise(function(resolve, reject) {
    self.on('complete', resolve)
    self.on('error', reject)
    self.on('abort', reject)
  })
}

/**
 * Inherit from `Emitter`.
 */

Emitter(Transaction.prototype)

/**
 * Create new `Store` in the scope of current transaction.
 *
 * @param {String} name
 * @return {Store}
 */

Transaction.prototype.store = function(name) {
  if (this.scope.indexOf(name) == -1) throw new TypeError('name out of scope')
  return this.db.store(name, this)
}

/**
 * Abort current transaction.
 *
 * @return {Promise}
 */

Transaction.prototype.abort = function() {
  var self = this
  return this.getInstance().then(function(tr) {
    self.removeAllListeners()
    tr.abort()
  })
}

/**
 * Make transaction thenable.
 *
 * @param {Function} onResolve
 * @param {Function} onReject
 * @return {Promise}
 */

Transaction.prototype.then = function(onResolve, onReject) {
  return this.promise.then(onResolve, onReject)
}

/**
 * Catch transaction error.
 *
 * @param {Function} onReject
 * @return {Promise}
 */

Transaction.prototype.catch = function(onReject) {
  return this.promise.then(null, onReject)
}

/**
 * Get raw transaction instance.
 * Logic is identical to db.getInstance().
 *
 * @return {Promise}
 */

Transaction.prototype.getInstance = function() {
  if (this.status == 'ready') return request.Promise.resolve(this.origin)
  if (this.status == 'initializing') return this.dbPromise
  if (this.status == 'error') throw new Error('transaction error')
  var self = this

  this.status = 'initializing'
  this.dbPromise = new request.Promise(function(resolve, reject) {
    self.db.getInstance().then(function(db) {
      var tr = db.transaction(self.scope, self.mode)
      tr.onerror = function(e) { self.onerror(e) }
      tr.onabort = function() { self.emit('abort') }
      tr.oncomplete = function() { self.emit('complete') }
      self.origin = tr
      self.status = 'ready'
      delete self.dbPromise
      resolve(tr)
    }).catch(function(err) {
      self.status = 'error'
      delete self.dbPromise
      reject(err)
    })
  })

  return this.dbPromise
}

/**
 * Error hook.
 *
 * @param {Error} err
 */

Transaction.prototype.onerror = function(err) {
  this.emit('error', err)
}

},{"component-emitter":6,"idb-request":9}],5:[function(require,module,exports){
(function (global){
var request = require('idb-request')
var parseRange = require('idb-range')
var Schema = require('idb-schema')
var Database = require('./idb-database')
var Transaction = require('./idb-transaction')
var Store = require('./idb-store')
var Index = require('./idb-index')

/**
 * Expose `Database`.
 */

exports = module.exports = Database

/**
 * Expose core classes.
 */

exports.schema = Schema
exports.Database = Database
exports.Transaction = Transaction
exports.Store = Store
exports.Index = Index
exports.request = request
exports.range = parseRange

/**
 * Get/Set `Promise` property.
 */

Object.defineProperty(exports, 'Promise', {
  get: function() { return request.Promise },
  set: function(Promise) { request.Promise = Promise },
})

/**
 * Check IndexedDB availability.
 */

Object.defineProperty(exports, 'supported', {
  get: function() { return !!(global.indexedDB || global.webkitIndexedDB) }
})

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./idb-database":1,"./idb-index":2,"./idb-store":3,"./idb-transaction":4,"idb-range":8,"idb-request":9,"idb-schema":10}],6:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],7:[function(require,module,exports){
/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object Error]': return 'error';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val !== val) return 'nan';
  if (val && val.nodeType === 1) return 'element';

  val = val.valueOf
    ? val.valueOf()
    : Object.prototype.valueOf.apply(val)

  return typeof val;
};

},{}],8:[function(require,module,exports){
(function (global){

/**
 * Parse `opts` to valid IDBKeyRange.
 * https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
 *
 * @param {Object} opts
 * @return {IDBKeyRange}
 */

module.exports = function range(opts) {
  var IDBKeyRange = global.IDBKeyRange || global.webkitIDBKeyRange
  if (typeof opts === 'undefined') return global.shimIndexedDB ? undefined : null
  if (opts instanceof IDBKeyRange) return opts
  if (!isObject(opts)) return IDBKeyRange.only(opts)
  var keys = Object.keys(opts).sort()

  if (keys.length == 1) {
    var key = keys[0]
    var val = opts[key]
    switch (keys[0]) {
      case 'eq': return IDBKeyRange.only(val)
      case 'gt': return IDBKeyRange.lowerBound(val, true)
      case 'lt': return IDBKeyRange.upperBound(val, true)
      case 'gte': return IDBKeyRange.lowerBound(val)
      case 'lte': return IDBKeyRange.upperBound(val)
      default: throw new TypeError('`' + key + '` is not valid key')
    }
  } else {
    var x = opts[keys[0]]
    var y = opts[keys[1]]
    var pattern = keys.join('-')

    switch (pattern) {
      case 'gt-lt': return IDBKeyRange.bound(x, y, true, true)
      case 'gt-lte': return IDBKeyRange.bound(x, y, true, false)
      case 'gte-lt': return IDBKeyRange.bound(x, y, false, true)
      case 'gte-lte': return IDBKeyRange.bound(x, y, false, false)
      default: throw new TypeError('`' + pattern +'` are conflicted keys')
    }
  }
}

/**
 * Check if `obj` is an object (an even not an array).
 *
 * @param {Object} obj
 * @return {Boolean}
 */

function isObject(obj) {
  return Object.prototype.toString.call(obj) == '[object Object]'
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
(function (global){

/**
 * Expose `request()`.
 */

exports = module.exports = request

/**
 * Expose link to `Promise`,
 * to enable replacement with different implementations.
 */

exports.Promise = global.Promise

/**
 * Transform IndexedDB request-like object to `Promise`.
 *
 * - request(req)
 * - request(tr) - wait for transaction complete
 * - request(req, tr) - handle request + wait for transaction complete
 * - request(req, iterator) - call iterator function
 *
 * @param {IDBRequest|IDBTransaction} req
 * @param {Function|IDBTransaction} [iterator]
 * @return {Promise}
 */

function request(req, iterator) {
  return new exports.Promise(function(resolve, reject) {
    req.onerror = function onerror(e) {
      // prevent global error throw
      // https://bugzilla.mozilla.org/show_bug.cgi?id=872873
      if (e.preventDefault) e.preventDefault()
      reject(e.target.error)
    }

    // open/deleteDatabase requests, can be locked, and it's an error
    if (req.onblocked === null) {
      req.onblocked = function onblocked(e) {
        if (e.preventDefault) e.preventDefault()
        reject(e.target.error)
      }
    }

    if (req.onsuccess === null) { // request
      if (iterator && iterator.oncomplete === null) { // second argument is transaction
        var result
        req.onsuccess = function onsuccess(e) { result = e.target.result }
        iterator.oncomplete = function oncomplete() { resolve(result) }
      } else {
        req.onsuccess = function onsuccess(e) {
          var res = e.target.result
          if (res && typeof iterator == 'function') { // check cursor
            iterator(res)
          } else {
            resolve(res) // resolve
          }
        }
      }
    } else { // transaction
      req.oncomplete = function oncomplete() { resolve() }
    }
  })
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],10:[function(require,module,exports){
var type = require('component-type')
var clone = require('component-clone')
var values = require('object-values')
var MAX_VERSION = Math.pow(2, 32) - 1

/**
 * Expose `Schema`.
 */

module.exports = Schema

/**
 * Initialize new `Schema`.
 */

function Schema() {
  if (!(this instanceof Schema)) return new Schema()
  this._stores = {}
  this._current = {}
  this._versions = {}
  this.version(1)
}

/**
 * Get/Set new version.
 *
 * @param {Number} [version]
 * @return {Schema|Number}
 */

Schema.prototype.version = function(version) {
  if (!arguments.length) return this._current.version
  if (type(version) != 'number' || version < 1 || version < this.version())
    throw new TypeError('not valid version')

  this._current = { version: version, store: null }
  this._versions[version] = {
    stores: [],      // db.createObjectStore
    dropStores: [],  // db.deleteObjectStore
    indexes: [],     // store.createIndex
    dropIndexes: [], // store.deleteIndex
    version: version // version
  }

  return this
}

/**
 * Add store.
 *
 * @param {String} name
 * @param {Object} [opts] { key: null, increment: false }
 * @return {Schema}
 */

Schema.prototype.addStore = function(name, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required')
  if (this._stores[name]) throw new TypeError('store is already defined')
  if (!opts) opts = {}

  var store = {
    name: name,
    indexes: {},
    keyPath: opts.key || opts.keyPath || null,
    autoIncrement: opts.increment || opts.autoIncrement || false
  }
  this._stores[name] = store
  this._versions[this.version()].stores.push(store)
  this._current.store = store

  return this
}

/**
 * Delete store.
 *
 * @param {String} name
 * @return {Schema}
 */

Schema.prototype.delStore = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required')
  var store = this._stores[name]
  if (!store) throw new TypeError('store is not defined')
  delete this._stores[name]
  this._versions[this.version()].dropStores.push(store)
  this._current.store = null
  return this
}

/**
 * Change current store.
 *
 * @param {String} name
 * @return {Schema}
 */

Schema.prototype.getStore = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required')
  if (!this._stores[name]) throw new TypeError('store is not defined')
  this._current.store = this._stores[name]
  return this
}

/**
 * Add index.
 *
 * @param {String} name
 * @param {String|Array} field
 * @param {Object} [opts] { unique: false, multi: false }
 * @return {Schema}
 */

Schema.prototype.addIndex = function(name, field, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required')
  if (type(field) != 'string' && type(field) != 'array') throw new TypeError('`field` is required')
  if (!opts) opts = {}
  var store = this._current.store
  if (store.indexes[name]) throw new TypeError('index is already defined')

  var index = {
    name: name,
    field: field,
    storeName: store.name,
    multiEntry: opts.multi || opts.multiEntry || false,
    unique: opts.unique || false
  }
  store.indexes[name] = index
  this._versions[this.version()].indexes.push(index)

  return this
}

/**
 * Delete index.
 *
 * @param {String} name
 * @return {Schema}
 */

Schema.prototype.delIndex = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required')
  var index = this._current.store.indexes[name]
  if (!index) throw new TypeError('index is not defined')
  delete this._current.store.indexes[name]
  this._versions[this.version()].dropIndexes.push(index)
  return this
}

/**
 * Generate onupgradeneeded callback.
 *
 * @return {Function}
 */

Schema.prototype.callback = function() {
  var versions = values(clone(this._versions))
    .sort(function(a, b) { return a.version - b.version })

  return function onupgradeneeded(e) {
    var oldVersion = e.oldVersion > MAX_VERSION ? 0 : e.oldVersion // Safari bug
    var db = e.target.result
    var tr = e.target.transaction

    versions.forEach(function(versionSchema) {
      if (oldVersion >= versionSchema.version) return

      versionSchema.stores.forEach(function(s) {
        db.createObjectStore(s.name, {
          keyPath: s.keyPath,
          autoIncrement: s.autoIncrement
        })
      })

      versionSchema.dropStores.forEach(function(s) {
        db.deleteObjectStore(s.name)
      })

      versionSchema.indexes.forEach(function(i) {
        var store = tr.objectStore(i.storeName)
        store.createIndex(i.name, i.field, {
          unique: i.unique,
          multiEntry: i.multiEntry
        })
      })

      versionSchema.dropIndexes.forEach(function(i) {
        var store = tr.objectStore(i.storeName)
        store.deleteIndex(i.name)
      })
    })
  }
}

/**
 * Get a description of the stores.
 * It creates a deep clone of `this._stores` object
 * and transform it to an array.
 *
 * @return {Array}
 */

Schema.prototype.stores = function() {
  return values(clone(this._stores)).map(function(store) {
    store.indexes = values(store.indexes).map(function(index) {
      delete index.storeName
      return index
    })
    return store
  })
}

/**
 * Clone `this` to new schema object.
 *
 * @return {Schema} - new object
 */

Schema.prototype.clone = function() {
  var schema = new Schema()
  var self = this
  Object.keys(this).forEach(function(key) {
    schema[key] = clone(self[key])
  })
  return schema
}

},{"component-clone":11,"component-type":7,"object-values":12}],11:[function(require,module,exports){
/**
 * Module dependencies.
 */

var type;
try {
  type = require('component-type');
} catch (_) {
  type = require('type');
}

/**
 * Module exports.
 */

module.exports = clone;

/**
 * Clones objects.
 *
 * @param {Mixed} any object
 * @api public
 */

function clone(obj){
  switch (type(obj)) {
    case 'object':
      var copy = {};
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          copy[key] = clone(obj[key]);
        }
      }
      return copy;

    case 'array':
      var copy = new Array(obj.length);
      for (var i = 0, l = obj.length; i < l; i++) {
        copy[i] = clone(obj[i]);
      }
      return copy;

    case 'regexp':
      // from millermedeiros/amd-utils - MIT
      var flags = '';
      flags += obj.multiline ? 'm' : '';
      flags += obj.global ? 'g' : '';
      flags += obj.ignoreCase ? 'i' : '';
      return new RegExp(obj.source, flags);

    case 'date':
      return new Date(obj.getTime());

    default: // string, number, boolean, …
      return obj;
  }
}

},{"component-type":7,"type":7}],12:[function(require,module,exports){
'use strict';
module.exports = function (obj) {
	var keys = Object.keys(obj);
	var ret = [];

	for (var i = 0; i < keys.length; i++) {
		ret.push(obj[keys[i]]);
	}

	return ret;
};

},{}]},{},[5])(5)
});