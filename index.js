
/**
 * Module dependencies.
 */

var indexedDB  = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var localStore = require('store');

/**
 * Expose `supported` and `createIndexed`.
 */

exports.supported = !! indexedDB;
exports.create    = createIndexed;

/**
 * Create a new indexed instance.
 * Name should contains db-name and store-name splited with colon
 *
 * Example:
 *
 *   // connect to db with name `notepad`, use store `notes`
 *   // use _id field as a key
 *   indexed = Indexed.create('notepad:notes', { key: '_id' });
 *
 * @options {String} name
 * @options {Object} options
 * @return {Object} self
 * @api public
 */

function createIndexed(name, options) {
  if (typeof name !== 'string') return onerror('name required');
  if (!options) options = {};
  var params = name.split(':');
  if (params.length !== 2) return onerror('name has format "dbName:storeName"');

  var key   = options.key || 'id';
  var store = new Store(params[0], params[1], key);

  return function(key, val, cb) {
    switch (arguments.length) {
      case 3: return val === null ? store.del(key, cb) : store.put(key, val, cb);
      case 2: return key === null ? store.clear(val)   : store.get(key, val);
      case 1: return store.all(key);
      case 0: return onerror('callback required');
    }
  };
}

/**
 * Shortcut method to return Indexed error
 */

function onerror(msg) {
  throw new TypeError('Indexed: ' + msg);
}

/**
 * Get current db version
 * if store with `storeName` was not initialized,
 * it will increment current version and add it to config.
 * Config stores in localStorage in indexed-`dbName`
 *
 * @options {String} dbName
 * @options {String} storeName
 * @return {Number}
 */

function getVersion(dbName, storeName) {
  var name   = 'indexed-' + dbName;
  var config = localStore(name) || { version: 0, stores: [] };

  if (config.stores.indexOf(storeName) < 0) {
    config.version += 1;
    config.stores.push(storeName);
    localStore(name, config);
  }

  return config.version;
}

/**
 * Construtor for `Store` object
 * to wrap IndexedDB methods to nice async API
 *
 * @options {String} dbName
 * @options {String} storeName
 * @options {String} key
 */

function Store(dbName, storeName, key) {
  this.dbName = dbName;
  this.name   = storeName;
  this.key    = key;
}

/**
 * Returns all values from the object store
 * Use cursor to iterate values
 *
 * @options {Function} cb
 */

Store.prototype.all = function(cb) {
  this.getStore('readonly', function(err, store) {
    if (err) return cb(err);

    var result = [];
    var req    = store.openCursor();
    req.onerror = cb;
    req.onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        result.push(cursor.value);
        cursor.continue();
      } else {
        cb(null, result);
      }
    };
  });
};

/**
 * Delete all objects in store
 *
 * @options {Function} cb
 */

Store.prototype.clear = function(cb) {
  this.getStore('readwrite', function(err, store, transaction) {
    if (err) return cb(err);

    var req = store.clear();
    req.onerror = cb;
    transaction.oncomplete = function(event) { cb(); };
  });
};

/**
 * Get object by `key`
 *
 * @options {Number|String} key
 * @options {Function} cb
 */

Store.prototype.get = function(key, cb) {
  this.getStore('readonly', function(err, store) {
    if (err) return cb(err);

    var req = store.get(key);
    req.onerror = cb;
    req.onsuccess = function(event) { cb(null, req.result); };
  });
};

/**
 * Delete object by `key`
 *
 * @options {Number|String} key
 * @options {Function} cb
 */

Store.prototype.del = function(key, cb) {
  this.getStore('readwrite', function(err, store, transaction) {
    if (err) return cb(err);

    var req = store.delete(key);
    req.onerror = cb;
    transaction.oncomplete = function(event) { cb(); };
  });
};

/**
 * Put - replace or create object by `key` with `val`
 * Mix `key` to `val`
 *
 * @options {Number|String} key
 * @options {Function} cb
 */

Store.prototype.put = function(key, val, cb) {
  this.getStore('readwrite', function(err, store, transaction) {
    if (err) return cb(err);

    val[this.key] = key;
    var req = store.put(val);
    req.onerror = cb;
    transaction.oncomplete = function(event) { cb(); };
  });
};

/**
 * Creates new transaction and returns object store
 * Calls calback in current context
 *
 * @options {String} mode - readwrite|readonly
 * @options {Function} cb
 * @api private
 */

Store.prototype.getStore = function(mode, cb) {
  var that = this;
  this.getDb(function(err, db) {
    if (err) return cb(err);

    var transaction = db.transaction([that.name], mode);
    var objectStore = transaction.objectStore(that.name);
    cb.call(that, null, objectStore, transaction);
  });
};

/**
 * Returns db instance
 * Performs connection and upgrade if needed
 *
 * @options {Function} cb
 * @api private
 */

// TODO: share one connection between different stores
Store.prototype.getDb = function(cb) {
  if (this.db) return cb(null, this.db);

  var that = this;
  var req  = indexedDB.open(this.dbName, getVersion(this.dbName, this.name));

  req.onerror = cb;
  req.onsuccess = function(event) {
    that.db = this.result;
    cb(null, that.db);
  };

  req.onupgradeneeded = function(event) {
    var db     = req.result;
    var stores = localStore('indexed-' + that.dbName).stores;

    for (var i = 0; i < stores.length; i++) {
      db.createObjectStore(stores[i], { keyPath: that.key });
    }
  };
};
