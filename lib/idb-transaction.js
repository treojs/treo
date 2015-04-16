var Emitter = require('component-emitter');
var request = require('idb-request');

/**
 * Expose `Transaction`.
 */

module.exports = Transaction;

/**
 * Initialize new `Transaction`.
 *
 * @param {Database} db
 * @param {Array} scope
 * @param {String} mode
 */

function Transaction(db, scope, mode) {
  var that = this;
  this.db = db;
  this.origin = null;
  this.status = 'close';

  this.scope = scope;
  this.mode = mode;
  this.promise = new request.Promise(function(resolve, reject) {
    that.on('complete', resolve);
    that.on('error', reject);
    that.on('abort', reject);
  });
}

/**
 * Inherit from `Emitter`.
 */

Emitter(Transaction.prototype);

/**
 * Create new `Store` in the scope of current transaction.
 *
 * @param {String} name
 * @return {Store}
 */

Transaction.prototype.store = function(name) {
  if (this.scope.indexOf(name) == -1) throw new TypeError('name out of scope');
  var store = this.db.store(name);
  store.tr = this;
  return store;
};

/**
 * Abort current transaction.
 *
 * @return {Promise}
 */

Transaction.prototype.abort = function() {
  return this.getInstance().then(function(tr) {
    tr.abort();
  });
};

/**
 * Make transaction thenable.
 *
 * @param {Function} onResolve
 * @param {Function} onReject
 * @return {Promise}
 */

Transaction.prototype.then = function(onResolve, onReject) {
  return this.promise.then(onResolve, onReject);
};

/**
 * Catch transaction error.
 *
 * @param {Function} onReject
 * @return {Promise}
 */

Transaction.prototype.catch = function(onReject) {
  return this.promise.then(null, onReject);
};

/**
 * Get raw transaction instance.
 * Logic is identical to db.getInstance().
 *
 * @return {Promise}
 */

Transaction.prototype.getInstance = function() {
  var that = this;
  if (this.status == 'ready') return request.Promise.resolve(this.origin);
  if (this.status == 'initializing') return createPromise(); // listen to "ready"

  this.status = 'initializing';
  initTransaction();
  return createPromise();

  function createPromise() {
    return new request.Promise(function(resolve, reject) {
      that.on('error', reject);
      that.on('ready', resolve);
    });
  }

  function initTransaction() {
    that.db.getInstance().then(function(db) {
      var tr = db.transaction(that.scope, that.mode);
      tr.onerror = function onerror(e) { that.emit('error', e) };
      tr.onabort = function onabort() { that.emit('abort') };
      tr.oncomplete = function oncomplete() { that.emit('complete') };
      that.origin = tr;
      that.status = 'ready';
      that.emit('ready', tr);
    }).catch(function(err) {
      that.emit('error', err);
    });
  }
};
