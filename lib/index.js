var type = require('component-type');
var Schema = require('idb-schema');
var Store = require('./idb-store');
var Index = require('./idb-index');

/**
 * Expose `Database`.
 */

exports = module.exports = Database;

/**
 * Expose core classes.
 */

exports.schema = Schema;
exports.Database = Database;
exports.Store = Store;
exports.Index = Index;

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
 * Use plugin `fn`.
 *
 * @param {Function} fn
* @return {Database}
 */

Database.prototype.use = function(fn) {
  fn(this, exports);
  return this;
};

/**
 * Drop.
 *
 * @param {Function} cb
 */

Database.prototype.drop = function(cb) {
  var name = this.name;
  this.close(function(err) {
    if (err) return cb(err);
    var req = indexedDB().deleteDatabase(name);
    req.onerror = cb;
    req.onsuccess = function onsuccess() { cb() };
  });
};

/**
 * Close.
 *
 * @param {Function} cb
 */

Database.prototype.close = function(cb) {
  if (this.status == 'close') return cb();
  this.getInstance(function(err, db) {
    if (err) return cb(err);
    db.origin = null;
    db.status = 'close';
    db.close();
    cb();
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
 * Get db instance. It starts opening transaction only once,
 * another requests will be scheduled to queue.
 *
 * @param {Function} cb
 */

Database.prototype.getInstance = function(cb) {
  if (this.status == 'open') return cb(null, this.origin);
  if (this.status == 'opening') return this.queue.push(cb);

  this.status = 'opening';
  this.queue = [cb]; // queue callbacks

  var that = this;
  var req = indexedDB().open(this.name, this.version);
  req.onupgradeneeded = this.onupgradeneeded;

  req.onerror = req.onblocked = function onerror(e) {
    that.status = 'error';
    that.queue.forEach(function(cb) { cb(e) });
    delete that.queue;
  };

  req.onsuccess = function onsuccess(e) {
    that.origin = e.target.result;
    that.status = 'open';
    that.origin.onversionchange = function onversionchange() {
      that.close(function() {});
    };
    that.queue.forEach(function(cb) { cb(null, that.origin) });
    delete that.queue;
  };
};

/**
 * Create new transaction for selected `stores`.
 *
 * @param {Array} stores - follow indexeddb semantic
 * @param {String} mode - readonly|readwrite or read|write
 * @param {Function} cb
 */

Database.prototype.transaction = function(stores, mode, cb) {
  if (!mode) mode = 'readonly';
  else if (mode == 'read') mode = 'readonly';
  else if (mode == 'write') mode = 'readwrite';
  this.getInstance(function(err, db) {
    err ? cb(err) : cb(null, db.transaction(stores, mode));
  });
};

/**
 * Dynamic link to `global.indexedDB` for polyfills support.
 *
 * @return {IDBDatabase}
 */

function indexedDB() {
  return global._indexedDB
    || global.indexedDB
    || global.msIndexedDB
    || global.mozIndexedDB
    || global.webkitIndexedDB;
}
