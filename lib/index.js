var type = require('component-type');
var Schema = require('./schema');
var Store = require('./idb-store');
var Index = require('./idb-index');

/**
 * Expose `Treo`.
 */

exports = module.exports = Treo;

/**
 * Initialize new `Treo` instance.
 *
 * @param {String} name
 * @param {Schema} schema
 */

function Treo(name, schema) {
  if (!(this instanceof Treo)) return new Treo(name, schema);
  if (type(name) != 'string') throw new TypeError('`name` required');
  if (!(schema instanceof Schema)) throw new TypeError('not valid schema');

  this.name = name;
  this.status = 'close';
  this.origin = null;
  this.stores = schema._stores;
  this.version = schema.getVersion();
  this.onupgradeneeded = schema.callback();

  // assign db property to each store
  Object.keys(this.stores).forEach(function(storeName) {
    this.stores[storeName].db = this;
  }, this);
}

/**
 * Expose core classes.
 */

exports.schema = Schema;
exports.cmp = cmp;
exports.Treo = Treo;
exports.Schema = Schema;
exports.Store = Store;
exports.Index = Index;

/**
 * Use plugin `fn`.
 *
 * @param {Function} fn
 * @return {Treo}
 */

Treo.prototype.use = function(fn) {
  fn(this, exports);
  return this;
};

/**
 * Drop.
 *
 * @param {Function} cb
 */

Treo.prototype.drop = function(cb) {
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

Treo.prototype.close = function(cb) {
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

Treo.prototype.store = function(name) {
  return this.stores[name];
};

/**
 * Get db instance. It starts opening transaction only once,
 * another requests will be scheduled to queue.
 *
 * @param {Function} cb
 */

Treo.prototype.getInstance = function(cb) {
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
 * @param {String} type (readwrite|readonly)
 * @param {Array} stores - follow indexeddb semantic
 * @param {Function} cb
 */

Treo.prototype.transaction = function(type, stores, cb) {
  this.getInstance(function(err, db) {
    err ? cb(err) : cb(null, db.transaction(stores, type));
  });
};

/**
 * Compare 2 values using IndexedDB comparision algotihm.
 *
 * @param {Mixed} value1
 * @param {Mixed} value2
 * @return {Number} -1|0|1
 */

function cmp() {
  return indexedDB().cmp.apply(indexedDB(), arguments);
}

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
