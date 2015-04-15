var Emitter = require('component-emitter');
var type = require('component-type');
var Schema = require('idb-schema');
var request = require('idb-request');
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

  this.name = name;
  this.status = 'close';
  this.origin = null;
  this.version = schema.version();
  this.onupgradeneeded = schema.callback();

  // assign db property to each store
  this.stores = {};
  schema.stores().forEach(function(store) {
    this.stores[store.name] = new Store(this, store);
  }, this);
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

Database.prototype.drop = function() {
  var name = this.name;
  var idb = global.indexedDB || global.webkitIndexedDB;
  return this.close().then(function() {
    return request(idb.deleteDatabase(name));
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
    // db.close() is not syncronous in Safari
    // so we wait a little bit to avoid exception on deleteDatabase.
    // But we close it immediately to avoid blocking onversionchange.
    db.close();
    return new request.Promise(function(resolve) {
      setTimeout(function() {
        that.origin = null;
        that.status = 'close';
        resolve();
      }, 30);
    });
  });
};

/**
 * Get store by `name`.
 *
 * @param {String} name
 * @return {Store}
 */

Database.prototype.store = function(name) {
  return this.stores[name];
};

/**
 * Get db instance.
 * It initiates opening transaction only once,
 * another requests will be scheduled to queue.
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
    req.onupgradeneeded = that.onupgradeneeded;

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

/**
 * Create new transaction for selected `stores`.
 *
 * @param {Array} stores - follow indexeddb semantic
 * @param {String} mode - readonly|readwrite or read|write
 * @return {Promise} (IDBTransaction)
 */

Database.prototype.transaction = function(stores, mode) {
  if (!mode) mode = 'readonly';
  else if (mode == 'read') mode = 'readonly';
  else if (mode == 'write') mode = 'readwrite';
  return this.getInstance().then(function(db) {
    return db.transaction(stores, mode);
  });
};
