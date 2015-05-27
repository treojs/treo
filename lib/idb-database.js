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
