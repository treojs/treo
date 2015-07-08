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
  if (this.status == 'error' || this.status == 'complete') throw new TypeError('transaction is inactive')
  return this.db.store(name, this)
}

/**
 * Abort current transaction.
 *
 * @return {Promise}
 */

Transaction.prototype.abort = function() {
  return this.getInstance().then(function(tr) {
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
  if (this.status == 'complete' || this.status == 'abort') throw new Error('transaction is inactive')
  var self = this

  this.status = 'initializing'
  this.dbPromise = new request.Promise(function(resolve, reject) {
    self.db.getInstance().then(function(db) {
      var tr = db.transaction(self.scope, self.mode)
      delete self.dbPromise
      self.status = 'ready'
      self.origin = tr
      tr.onerror = function(e) { self.onerror(e) }
      tr.oncomplete = function() { self.oncomplete() }
      tr.onabort = function() { self.onabort() }
      resolve(tr)
    }).catch(function(err) {
      delete self.dbPromise
      self.status = 'error'
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
  this.status = 'error'
  this.emit('error', err)
}

/**
 * Complete hook.
 */

Transaction.prototype.oncomplete = function() {
  this.status = 'complete'
  this.emit('complete')
}

/**
 * Abort hook.
 */

Transaction.prototype.onabort = function() {
  this.status = 'aborted'
  this.emit('abort')
  this.removeAllListeners()
}
