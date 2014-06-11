var type = require('type');
var Schema = require('./schema');
var Store = require('./store');

/**
 * Link to `indexedDB`.
 */

var indexedDB = window.indexedDB
  || window.mozIndexedDB
  || window.webkitIndexedDB;

/**
 * Expose `Treo`.
 */

module.exports = Treo;

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
  this.stores = schema.getStores();
  this.stores.forEach(function(store) { store.db = this }, this);
  this.status = 'close';
  this.origin = null;
  this.schema = schema;
}

/**
 * Expose internal classes.
 */

Treo.schema = Schema;
Treo.Schema = Schema;
Treo.Store = Store;
Treo.supported = !! indexedDB;

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
    req.onerror = function onerror(e) { cb(e.target.error) };
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
    if (err) cb(err);
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
  for (var i = 0, len = this.stores.length, store; i < len; i++) {
    store = this.stores[i];
    if (store.name == name) return store;
  }
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
  req.onerror = function onerror(e) {
    that.queue.forEach(function(cb) { cb(e.target.error) });
  };
  req.onsuccess = function onsuccess(e) {
    that.origin = e.target.result;
    that.status = 'open';
    that.queue.forEach(function(cb) { cb(null, that.origin) });
  };
};
