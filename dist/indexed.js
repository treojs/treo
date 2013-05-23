;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);
  var index = path + '/index.js';

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
  }

  if (require.aliases.hasOwnProperty(index)) {
    return require.aliases[index];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("yields-unserialize/index.js", function(exports, require, module){

/**
 * Unserialize the given "stringified" javascript.
 * 
 * @param {String} val
 * @return {Mixed}
 */

module.exports = function(val){
  try {
    return JSON.parse(val);
  } catch (e) {
    return val || undefined;
  }
};

});
require.register("yields-store/index.js", function(exports, require, module){

/**
 * dependencies.
 */

var unserialize = require('unserialize')
  , storage = window.localStorage;

/**
 * Store the given `key` `val`.
 * 
 * @param {String} key
 * @param {Mixed} val
 * @return {Mixed}
 */

exports = module.exports = function(key, val){
  switch (arguments.length) {
    case 2: return set(key, val);
    case 1: return get(key);
    case 0: return all();
  }
};

/**
 * supported flag.
 */

exports.supported = !! storage;

/**
 * export methods.
 */

exports.set = set;
exports.get = get;
exports.all = all;

/**
 * Set `key` to `val`.
 * 
 * @param {String} key
 * @param {Mixed} val
 */

function set(key, val){
  return null == val
    ? storage.removeItem(key)
    : storage.setItem(key, JSON.stringify(val));
}

/**
 * Get `key`.
 * 
 * @param {String} key
 * @return {Mixed}
 */

function get(key){
  return null == key
    ? storage.clear()
    : unserialize(storage.getItem(key));
}

/**
 * Get all.
 * 
 * @return {Object}
 */

function all(){
  var len = storage.length
    , ret = {}
    , key
    , val;

  for (var i = 0; i < len; ++i) {
    key = storage.key(i);
    ret[key] = get(key);
  }

  return ret;
}

});
require.register("timoxley-next-tick/index.js", function(exports, require, module){
if (typeof setImmediate == 'function') {
  module.exports = function(ƒ){ setImmediate(ƒ) }
}
// legacy node.js
else if (typeof process != 'undefined' && typeof process.nextTick == 'function') {
  module.exports = process.nextTick
}
// fallback for other environments / postMessage behaves badly on IE8
else if (typeof window == 'undefined' || window.ActiveXObject || !window.postMessage) {
  module.exports = function(ƒ){ setTimeout(ƒ) };
} else {
  var q = [];

  window.addEventListener('message', function(){
    var i = 0;
    while (i < q.length) {
      try { q[i++](); }
      catch (e) {
        q = q.slice(i);
        window.postMessage('tic!', '*');
        throw e;
      }
    }
    q.length = 0;
  }, true);

  module.exports = function(fn){
    if (!q.length) window.postMessage('tic!', '*');
    q.push(fn);
  }
}

});
require.register("indexed/index.js", function(exports, require, module){

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

Indexed.prototype._getStore = function(mode, cb) {
  var that = this;
  this._getDb(function(err, db) {
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

Indexed.prototype._getDb = function(cb) {
  var that = this;
  var db   = dbs[this.dbName];

  if (db) {
    if (this.connected) return cb(null, db);
    this._connectOrUpgrade(db, cb);
  } else {
    var req = indexedDB.open(this.dbName);
    req.onerror = onerror(cb);
    req.onsuccess = function(event) {
      var db = event.target.result;
      dbs[that.dbName] = db;
      that._connectOrUpgrade(db, cb);
    };
  }
};

/**
 * Check that `db.version` is equal to config version
 * Performs connect of db _upgrade
 *
 * @options {Object} db
 * @options {Function} cb
 * @api private
 */

Indexed.prototype._connectOrUpgrade = function(db, cb) {
  var config = this._getUpgradeConfig(db, false);

  if (config.version !== db.version) {
    this._upgrade(db, cb);
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

Indexed.prototype._upgrade = function(db, cb) {
  var that   = this;
  var config = this._getUpgradeConfig(db, true);

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
 * Returns config for _upgrade of `db`. New version and action.
 * Check existing of store with valid keyPath.
 * Save config to localStorage when `save` is true
 * Prefer info from db to stored config
 *
 * @options {Object} db
 * @options {Boolean} save
 * @api private
 */

Indexed.prototype._getUpgradeConfig = function(db, save) {
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
    var that     = this;
    var args     = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    var cb       = args[args.length - 1];
    var argsName = argsCount === 1 ? ' argument' : ' arguments';

    if (args.length !== argsCount) throw new TypeError('method has ' + argsCount + argsName);
    if (typeof cb !== 'function')  throw new TypeError('callback required');

    this._getStore(mode, function(err, store, tr) {
      if (err) return cb(err);
      handler.apply(that, [store, tr].concat(args));
    });
  };
}

});
require.alias("yields-store/index.js", "indexed/deps/store/index.js");
require.alias("yields-store/index.js", "store/index.js");
require.alias("yields-unserialize/index.js", "yields-store/deps/unserialize/index.js");

require.alias("timoxley-next-tick/index.js", "indexed/deps/next-tick/index.js");
require.alias("timoxley-next-tick/index.js", "next-tick/index.js");

require.alias("indexed/index.js", "indexed/index.js");

if (typeof exports == "object") {
  module.exports = require("indexed");
} else if (typeof define == "function" && define.amd) {
  define(function(){ return require("indexed"); });
} else {
  this["Indexed"] = require("indexed");
}})();