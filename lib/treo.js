var type = require('type');
var Schema = require('./schema');
var Store = require('./store');
var Index = require('./index');

/**
 * `indexedDB` reference.
 */

var indexedDB = window.indexedDB
  || window.msIndexedDB
  || window.mozIndexedDB
  || window.webkitIndexedDB;

/**
 * Expose `Treo`.
 */

exports = module.exports = Treo;

/**
 * Initialize new `Treo`.
 *
 * @param {String} name
 * @param {Schema} schema
 */

function Treo(name, schema) {
  if (!(this instanceof Treo)) return new Treo(name, schema);
  if (type(name) != 'string') throw new TypeError('`name` required');
  if (!(schema instanceof Schema)) throw new TypeError('not valid schema');
  this.name = name;
  this.version = schema.getVersion();
  this.status = 'close';
  this.origin = null;
  this.schema = schema;
  this.stores = schema._stores;
  for (var key in this.stores) this.stores[key].db = this; // FIXME
}

/**
 * Expose core classes.
 */

exports.schema = Schema;
exports.Treo = Treo;
exports.Schema = Schema;
exports.Store = Store;
exports.Index = Index;

/**
 * Drop.
 *
 * @param {Function} cb
 */

Treo.prototype.drop = function(cb) {
  var name = this.name;
  this.close(function(err) {
    if (err) return cb(err);
    var req = indexedDB.deleteDatabase(name);
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
 * Get original db instance.
 *
 * @param {Function} cb
 */

Treo.prototype.getInstance = function(cb) {
  if (this.status == 'open') return cb(null, this.origin);
  if (this.status == 'opening') return this.queue.push(cb);

  this.status = 'opening';
  this.queue = [cb]; // queue callbacks

  var that = this;
  var req = indexedDB.open(this.name, this.version);

  req.onupgradeneeded = this.schema.callback();
  req.onerror = req.onblocked = function onerror(e) {
    that.queue.forEach(function(cb) { cb(e) });
  };
  req.onsuccess = function onsuccess(e) {
    that.origin = e.target.result;
    that.status = 'open';
    that.queue.forEach(function(cb) { cb(null, that.origin) });
  };
};

/**
 * Create new transaction for selected `stores`.
 *
 * @param {String} type (readwrite|readonly)
 * @param {Array} stores - to follow indexeddb semantique
 * @param {Function} cb
 */

Treo.prototype.transaction = function(type, stores, cb) {
  this.getInstance(function(err, db) {
    err ? cb(err) : cb(null, db.transaction(stores, type));
  });
};
