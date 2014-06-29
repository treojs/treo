var type = require('type');
var Schema = require('./schema');
var Store = require('./idb-store');
var Index = require('./idb-index');
var range = require('./range');

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
  this.status = 'close';
  this.origin = null;
  this.stores = {};
  this.version = schema.getVersion();
  this.upgradeCallback = createUpgradeCallback(schema._versions);

  // setup stores and indexes
  Object.keys(schema._stores).forEach(function(storeName) {
    var s = schema._stores[storeName];
    var store = this.stores[storeName] = new Store(this, s.name, s.opts);
    Object.keys(s.indexes).forEach(function(indexName) {
      var i = s.indexes[indexName];
      store.indexes[indexName] = new Index(store, i.name, i.field, i.opts);
    });
  }, this);
}

/**
 * Expose core classes.
 */

exports.schema = Schema;
exports.range = range;
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
  var req = indexedDB.open(this.name, this.version);

  req.onupgradeneeded = this.upgradeCallback;
  req.onerror = req.onblocked = function onerror(e) {
    that.status = 'error';
    that.queue.forEach(function(cb) { cb(e) });
    delete that.queue;
  };
  req.onsuccess = function onsuccess(e) {
    that.origin = e.target.result;
    that.status = 'open';
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
 * Create callback for `upgradeneeded` event based on `versions`.
 *
 * @param {Object} versions
 * @return {Function}
 */

function createUpgradeCallback(versions) {
  var allVersions = Object.keys(versions)
    .map(function(v) { return parseInt(v, 10) }).sort();

  return function onupgradeneeded(e) {
    var db = e.target.result;
    var tr = e.target.transaction;

    allVersions.forEach(function(version) {
      if (e.oldVersion >= version) return;
      var versionSchema = versions[version];

      versionSchema.stores.forEach(function(store) {
        db.createObjectStore(store.name, { keyPath: store.opts.key });
      });

      versionSchema.indexes.forEach(function(index) {
        var store = tr.objectStore(index.store.name);
        var opts = { unique: index.opts.unique, multiEntry: index.opts.multi };
        store.createIndex(index.name, index.field, opts);
      });
    });
  };
}
