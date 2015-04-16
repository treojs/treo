var Emitter = require('component-emitter');
var type = require('component-type');
var Schema = require('idb-schema');
var request = require('idb-request');
var Transaction = require('./idb-transaction');
var Store = require('./idb-store');

/**
 * Expose `Database`.
 */

module.exports = Database;

/**
 * Initialize new `Database` instance.
 *
 * @param {String} name
 * @param {Schema} schema
 */

function Database(name, schema) {
  if (!(this instanceof Database)) return new Database(name, schema);
  if (type(name) != 'string') throw new TypeError('`name` required');
  if (!(schema instanceof Schema)) throw new TypeError('not valid schema');

  this.status = 'close';
  this.origin = null;
  this.schema = schema;
  this.opts = schema.stores();

  this.name = name;
  this.version = schema.version();
  this.stores = this.opts.map(function(store) { return store.name });
}

/**
 * Inherit from `Emitter`.
 */

Emitter(Database.prototype);

/**
 * Use plugin `fn`.
 *
 * @param {Function} fn
 * @return {Database}
 */

Database.prototype.use = function(fn) {
  fn(this, require('./index'));
  return this;
};

/**
 * Close connection && delete database.
 *
 * @return {Promise}
 */

Database.prototype.del = function() {
  var dbName = this.name;
  var idb = global.indexedDB || global.webkitIndexedDB;
  return this.close().then(function() {
    // wait a little to avoid exception in Safari
    return new request.Promise(function(resolve) {
      setTimeout(resolve, 50);
    }).then(function() {
      return request(idb.deleteDatabase(dbName));
    });
  });
};

/**
 * Close database.
 *
 * @return {Promise}
 */

Database.prototype.close = function() {
  if (this.status == 'close') return request.Promise.resolve();
  var that = this;
  return this.getInstance().then(function(db) {
    db.close();
    that.removeAllListeners();
    that.origin = null;
    that.status = 'close';
  });
};

/**
 * Get store by `name`.
 *
 * @param {String} name
 * @return {Store}
 */

Database.prototype.store = function(name) {
  var index = this.stores.indexOf(name);
  if (index == -1) throw new TypeError('invalid store name');
  return new Store(this, this.opts[index]);
};

/**
 * Create new transaction for selected `scope`.
 *
 * @param {Array} scope - follow indexeddb semantic
 * @param {String} mode - readonly|readwrite or read|write
 * @return {Transaction}
 */

Database.prototype.transaction = function(scope, mode) {
  if (!mode) mode = 'readonly';
  else if (mode == 'read') mode = 'readonly';
  else if (mode == 'write') mode = 'readwrite';
  return new Transaction(this, scope, mode);
};

/**
 * Get raw db instance.
 * It initiates opening transaction only once,
 * another requests will be fired on "open" event.
 *
 * @return {Promise} (IDBDatabase)
 */

Database.prototype.getInstance = function() {
  var that = this;
  if (this.status == 'open') return request.Promise.resolve(this.origin);
  if (this.status == 'opening') return createPromise(); // listen to "open"

  this.status = 'opening';
  openDb();
  return createPromise();

  function createPromise() {
    return new request.Promise(function(resolve, reject) {
      that.on('error', reject);
      that.on('open', resolve);
    });
  }

  function openDb() {
    var idb = global.indexedDB || global.webkitIndexedDB;
    var req = idb.open(that.name, that.version);
    req.onupgradeneeded = that.schema.callback();

    req.onerror = req.onblocked = function onerror(e) {
      that.status = 'error';
      that.emit('error', e);
    };

    req.onsuccess = function onsuccess(e) {
      var db = e.target.result;
      that.status = 'open';
      that.origin = db;
      db.onerror = function onerror(e) { that.emit('error', e) };
      db.onabort = function onabort() { that.emit('abort'); };
      db.onversionchange = function onversionchange(e) {
        that.emit('versionchange', e);
        // default handler to prevent blocking
        that.close().catch(function(e) { that.emit('error', e) });
      };
      that.emit('open', db);
    };
  }
};
