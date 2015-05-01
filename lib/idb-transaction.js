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
      tr.onerror = function(e) { self.emit('error', e) }
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
