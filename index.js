
/**
 * Module dependencies.
 */

var store    = require('store');
var nextTick = require('next-tick');

/**
 * Local variables.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var dbs       = {};
var indexOf   = [].indexOf;
var slice     = [].slice;

/**
 * Expose public api.
 */

module.exports    = exports = Indexed;
exports.drop      = drop;

// https://github.com/Modernizr/Modernizr/blob/master/feature-detects/indexedDB.js
exports.supported = !! indexedDB;

/**
 * Drop IndexedDB instance by name.
 *
 * @options {String} dbName
 * @options {function} cb
 * @api public
 */

function drop(dbName, cb) {
  store('indexed-' + dbName, null);

  if (dbs[dbName]) {
    db.close();
    delete dbs[dbName];
  }

  var req = indexedDB.deleteDatabase(dbName);
  req.onerror = onerror(cb);
  req.onsuccess = function(event) { cb(); };
}

/**
 * Construtor for `Indexed` object to wrap IndexedDB methods with nice async API.
 * `name` contains db-name and store-name splited with colon.
 *
 * Example:
 *
 *   // connect to db with name `notepad`, use store `notes`
 *   // use _id field as a key
 *   indexed = new Indexed('notepad:notes', { key: '_id' });
 *
 * @options {String} name
 * @options {Object} options
 * @api public
 */

function Indexed(name, options) {
  if (typeof name !== 'string') throw new TypeError('name required');
  if (!options) options = {};
  var params = name.split(':');
  if (params.length !== 2) throw new TypeError('name has format "dbName:storeName"');

  this.dbName    = params[0];
  this.name      = params[1];
  this.key       = options.key || 'id';
  this.connected = false;
}

/**
 * Returns all values from the object store.
 * Use cursor to iterate values.
 *
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.all = transaction(1, 'readonly', function(store, tr, cb) {
  var result = [];
  var req = store.openCursor();
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

/**
 * Get object by `key`.
 *
 * @options {Mixin} key
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.get = transaction(2, 'readonly', function(store, tr, key, cb) {
  var req = store.get(key);
  req.onerror = onerror(cb);
  req.onsuccess = function(event) { cb(null, req.result); };
});

/**
 * Delete all objects in store.
 *
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.clear = transaction(1, 'readwrite', function(store, tr, cb) {
  var req = store.clear();
  req.onerror = onerror(cb);
  tr.oncomplete = function(event) { cb(null); };
});

/**
 * Delete object by `key`.
 *
 * @options {Mixin} key
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.del = transaction(2, 'readwrite', function(store, tr, key, cb) {
  var req = store.delete(key);
  req.onerror = onerror(cb);
  tr.oncomplete = function(event) { cb(null); };
});

/**
 * Replace or create object by `key` with `val`.
 * Extends `val` with `key` automatically.
 * Handles error for invalid key.
 *
 * @options {Mixin} key
 * @options {Mixin} val
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.put = transaction(3, 'readwrite', function(store, tr, key, val, cb) {
  val[this.key] = key;
  try {
    var req = store.put(val);
    req.onerror = onerror(cb);
    tr.oncomplete = function(event) { cb(null, val); };
  } catch (err) {
    nextTick(function(){ cb(err); });
  }
});

/**
 * Creates new transaction and returns object store
 *
 * @options {String} mode - readwrite|readonly
 * @options {Function} cb
 * @api private
 */

Indexed.prototype.getStore = function(mode, cb) {
  var that = this;
  this.getDb(function(err, db) {
    if (err) return cb(err);

    var transaction = db.transaction([that.name], mode);
    var objectStore = transaction.objectStore(that.name);
    cb(null, objectStore, transaction);
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

Indexed.prototype.getDb = function(cb) {
  var that = this;
  var db   = dbs[this.dbName];

  if (db) {
    if (this.connected) return cb(null, db);
    this.connectOrUpgrade(db, cb);
  } else {
    var req = indexedDB.open(this.dbName);
    req.onerror = onerror(cb);
    req.onsuccess = function(event) {
      var db = event.target.result;
      dbs[that.dbName] = db;
      that.connectOrUpgrade(db, cb);
    };
  }
};

/**
 * Check that `db.version` is equal to config version
 * Performs connect of db upgrade
 *
 * @options {Object} db
 * @options {Function} cb
 * @api private
 */

Indexed.prototype.connectOrUpgrade = function(db, cb) {
  var config = this.getUpgradeConfig(db, false);

  if (config.version !== db.version) {
    this.upgrade(db, cb);
  } else {
    this.connected = true;
    cb(null, db);
  }
};

/**
 * Close current db connection and open new
 * Create object store if needed and recreate it when key options changed
 *
 * @options {Object} db
 * @options {Function} cb
 * @api private
 */

Indexed.prototype.upgrade = function(db, cb) {
  var that   = this;
  var config = this.getUpgradeConfig(db, true);

  db.close();
  var req = indexedDB.open(this.dbName, config.version);
  req.onerror = onerror(cb);
  req.onsuccess = function(event) {
    var db = event.target.result;
    dbs[that.dbName] = db;
    that.connected = true;
    cb(null, db);
  };
  req.onupgradeneeded = function(event) {
    var db = this.result;

    if (config.action === 'recreate') db.deleteObjectStore(that.name);
    if (config.action) db.createObjectStore(that.name, { keyPath: that.key });
  };
};

/**
 * Returns config for upgrade of `db`. New version and action.
 * Check existing of store with valid keyPath.
 * Save config to localStorage when `save` is true
 * Prefer info from db to stored config
 *
 * @options {Object} db
 * @options {Boolean} save
 * @api private
 */

Indexed.prototype.getUpgradeConfig = function(db, save) {
  var name    = 'indexed-' + this.dbName;
  var version = db.version || 1;
  var config  = store(name) || { version: version, stores: [], keys: {} };
  var action  = null;

  if (config.stores.indexOf(this.name) < 0) {
    config.stores.push(this.name);
    if (indexOf.call(db.objectStoreNames, this.name) < 0) {
      config.version += 1;
      action = 'create';
    }
  }
  if (!config.keys[this.name] || config.keys[this.name] !== this.key) {
    config.keys[this.name] = this.key;
    if (!action) {
      var objectStore = db.transaction([this.name], 'readonly')
        .objectStore(this.name);

      if (objectStore.keyPath !== this.key) {
        config.version += 1;
        action = 'recreate';
      }
    }
  }

  if (save) store(name, config);
  return { version: config.version, action: action };
};

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
 * Helper to force transaction for current store
 * Also manages arguments count and callback
 *
 * @options {Number} argsCount
 * @options {String} mode {readwrite|readonly}
 * @options {Function} handler
 * @return {Function}
 */

function transaction(argsCount, mode, handler) {
  return function() {
    var that = this;
    var args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    var cb   = args[args.length - 1];

    if (args.length !== argsCount) throw new TypeError('method has ' + argsCount + ' arguments');
    if (typeof cb !== 'function')  throw new TypeError('callback required');

    this.getStore(mode, function(err, store, tr) {
      if (err) return cb(err);
      handler.apply(that, [store, tr].concat(args));
    });
  };
}
