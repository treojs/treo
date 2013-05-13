
/**
 * Module dependencies.
 */

var localStore = require('store');

/**
 * Local variables.
 */

var indexedDB     = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var dbs           = {};
var defaultConfig = { version: 0, stores: [], keys: {} };

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
  if (typeof name !== 'string') throw new TypeError('name required');
  if (!options) options = {};
  var params = name.split(':');
  if (params.length !== 2) throw new TypeError('name has format "dbName:storeName"');

  var key   = options.key || 'id';
  var store = new Store(params[0], params[1], key);

  return function(key, val, cb) {
    switch (arguments.length) {
      case 3: return val === null ? store.del(key, cb) : store.put(key, val, cb);
      case 2: return key === null ? store.clear(val)   : store.get(key, val);
      case 1: return store.all(key);
      case 0: throw new TypeError('callback required');
    }
  };
}

/**
 * Handle request errors.
 * Wrap callback and return function to manage event
 *
 * @options {Function} cb
 * @return {Function}
 */

function onerror(cb) {
  return function(event) {
    cb(event.target.errorCode);
  };
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
  this.dbName    = dbName;
  this.name      = storeName;
  this.key       = key;
  this.connected = false;
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
    req.onerror = onerror(cb);
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
    req.onerror = onerror(cb);
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
    req.onerror = onerror(cb);
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
    req.onerror = onerror(cb);
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
    req.onerror = onerror(cb);
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
 * Use dbs to manage db connections
 *
 * @options {Function} cb
 * @api private
 */

Store.prototype.getDb = function(cb) {
  var that = this;
  var db   = dbs[this.dbName];

  if (db) {
    if (this.connected) return cb(null, db);
    this.connectOrUpgrade(db, db.version, cb);
  } else {
    var req = indexedDB.open(this.dbName);
    req.onerror = onerror(cb);
    req.onsuccess = function(event) {
      var db = event.target.result;
      that.connectOrUpgrade(db, db.version, cb);
    };
  }
};

Store.prototype.connectOrUpgrade = function(db, version, cb) {
  if (this.needUpgrade(version))
    this.upgrade(db, version, cb);
  else
    this.connect(db, cb);
};

Store.prototype.needUpgrade = function(version) {
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

  function getVersion(store) {
    var name   = 'indexed-' + store.dbName;
    var config = localStore(name) || { version: 0, stores: [], keys: {} };

    // если имени не существует мы должны создать store с выбранным ключом
    // при изминении ключа store пересоздаётся
    // в тот момент когда создаётся новый store, соединение должно закрыться, потом открыться заново
    if (config.stores.indexOf(store.name) < 0) {
      config.stores.push(store.name);
      // DRY + fix req.onupgradeneeded
      config.version += 1;
      localStore(name, config);
    } else if (config.keys[store.name] !== store.key) {
      config.keys[store.name] = store.key;
      config.version += 1;
      localStore(name, config);
    }

    return config.version;
  }
};

Store.prototype.connect = function(db, cb) {
  this.connected   = true;
  dbs[this.dbName] = db;
  cb(null, db);
};

Store.prototype.upgrade = function(db, version, cb) {
  db.close();
  var req  = indexedDB.open(that.dbName, config.version);
  req.onerror = onerror(cb);
  req.onsuccess = function(event) {
    that.connect(event.target.result, cb);
  };
  req.onupgradeneeded = function(event) {
    var db     = req.result;
    var stores = localStore('indexed-' + that.dbName).stores;

    for (var i = 0; i < stores.length; i++) {
      db.createObjectStore(stores[i], { keyPath: that.key });
    }
  };
};
