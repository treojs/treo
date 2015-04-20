const Emitter = require('component-emitter')
const type = require('component-type')
const Schema = require('idb-schema')
const request = require('idb-request')
const Transaction = require('./idb-transaction')
const Store = require('./idb-store')

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
  this.stores = this.opts.map((store) => store.name)
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
  fn(this, require('./index'))
  return this
}

/**
 * Close connection && delete database.
 * After close it waits a little to avoid exception in Safari.
 *
 * @return {Promise}
 */

Database.prototype.del = function() {
  const idb = global.indexedDB || global.webkitIndexedDB
  return this.close().then(() => {
    return new request.Promise((resolve) => {
      setTimeout(resolve, 50)
    }).then(() => {
      return request(idb.deleteDatabase(this.name))
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
  return this.getInstance().then((db) => {
    db.close()
    this.removeAllListeners()
    this.origin = null
    this.status = 'close'
  })
}

/**
 * Get store by `name`.
 *
 * @param {String} name
 * @param {Transaction} tr
 * @return {Store}
 */

Database.prototype.store = function(name, tr) {
  const i = this.stores.indexOf(name)
  if (i == -1) throw new TypeError('invalid store name')
  return new Store(this, tr, this.opts[i])
}

/**
 * Create new transaction for selected `scope`.
 *
 * @param {Array} scope - follow indexeddb semantic
 * @param {String} mode - readonly|readwrite or read|write
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

  this.status = 'opening'
  this.promise = new request.Promise((resolve, reject) => {
    const idb = global.indexedDB || global.webkitIndexedDB
    const req = idb.open(this.name, this.version)

    req.onupgradeneeded = this.schema.callback()
    req.onerror = req.onblocked = (e) => {
      delete this.promise
      this.status = 'error'
      reject(e)
    }
    req.onsuccess = (e) => {
      const db = e.target.result
      delete this.promise
      this.status = 'open'
      this.origin = db
      db.onerror = (e) => this.emit('error', e)
      db.onabort = () => this.emit('abort')
      db.onversionchange = (e) => {
        this.emit('versionchange', e)
        this.close().catch((e) => this.emit('error', e)) // default handler
      }
      resolve(db)
    }
  })

  return this.promise
}
