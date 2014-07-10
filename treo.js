
;(function(){

/**
 * Require the module at `name`.
 *
 * @param {String} name
 * @return {Object} exports
 * @api public
 */

function require(name) {
  var module = require.modules[name];
  if (!module) throw new Error('failed to require "' + name + '"');

  if (!('exports' in module) && typeof module.definition === 'function') {
    module.client = module.component = true;
    module.definition.call(this, module.exports = {}, module);
    delete module.definition;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Register module at `name` with callback `definition`.
 *
 * @param {String} name
 * @param {Function} definition
 * @api private
 */

require.register = function (name, definition) {
  require.modules[name] = {
    definition: definition
  };
};

/**
 * Define a module's exports immediately with `exports`.
 *
 * @param {String} name
 * @param {Generic} exports
 * @api private
 */

require.define = function (name, exports) {
  require.modules[name] = {
    exports: exports
  };
};
require.register("component~type@1.0.0", function (exports, module) {

/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Function]': return 'function';
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object String]': return 'string';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val && val.nodeType === 1) return 'element';
  if (val === Object(val)) return 'object';

  return typeof val;
};

});

require.register("treo", function (exports, module) {
var type = require("component~type@1.0.0");
var Schema = require("treo/lib/schema.js");
var Store = require("treo/lib/idb-store.js");
var Index = require("treo/lib/idb-index.js");
var range = require("treo/lib/range.js");

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
exports.cmp = cmp;
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

/**
 * Compare 2 values using IndexedDB comparision algotihm.
 *
 * @param {Mixed} value1
 * @param {Mixed} value2
 * @return {Number} -1|0|1
 */

function cmp() {
  return indexedDB.cmp.apply(indexedDB, arguments);
}

});

require.register("treo/lib/schema.js", function (exports, module) {
var type = require("component~type@1.0.0");

/**
 * Expose `Schema`.
 */

module.exports = Schema;

/**
 * Initialize new `Schema`.
 */

function Schema() {
  if (!(this instanceof Schema)) return new Schema();
  this._current = {};
  this._stores = {};
  this._versions = {};
}

/**
 * Set new version.
 *
 * @param {Number} version
 * @return {Schema}
 */

Schema.prototype.version = function(version) {
  if (type(version) != 'number' || version < 1 || version < this.getVersion())
    throw new TypeError('not valid version');

  this._versions[version] = { stores: [], indexes: [] };
  this._current = { version: version, store: null };
  return this;
};

/**
 * Add store.
 *
 * @param {String} name
 * @param {Object} [opts] { key: false }
 * @return {Schema}
 */

Schema.prototype.addStore = function(name, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (this._stores[name]) throw new TypeError('store is already defined');
  var store = { name: name, indexes: {}, opts: opts || {} };
  this._versions[this.getVersion()].stores.push(store);
  this._stores[name] = store;
  this._current.store = store;
  return this;
};

/**
 * Add index.
 *
 * @param {String} name
 * @param {String} field
 * @param {Object} [opts] { unique: false, multi: false }
 * @return {Schema}
 */

Schema.prototype.addIndex = function(name, field, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (type(field) != 'string') throw new TypeError('`field` is required');
  var store = this._current.store;
  var index = { store: store, name: name, field: field, opts: opts || {} };
  if (store.indexes[name]) throw new TypeError('index is already defined');
  store.indexes[name] = index;
  this._versions[this.getVersion()].indexes.push(index);
  return this;
};

/**
 * Change current store.
 *
 * @param {String} name
 * @return {Schema}
 */

Schema.prototype.getStore = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (!this._stores[name]) throw new TypeError('store is not defined');
  this._current.store = this._stores[name];
  return this;
};

/**
 * Get version.
 *
 * @return {Number}
 */

Schema.prototype.getVersion = function() {
  return this._current.version;
};

});

require.register("treo/lib/idb-store.js", function (exports, module) {
var type = require("component~type@1.0.0");
var parseRange = require("treo/lib/range.js");

/**
 * Expose `Store`.
 */

module.exports = Store;

/**
 * Initialize new `Store`.
 *
 * @param {Treo} db
 * @param {String} name
 * @param {Object} opts
 */

function Store(db, name, opts) {
  this.db = db;
  this.name = name;
  this.indexes = {};
  this.key = opts.key || undefined;
}

/**
 * Get index by `name`.
 *
 * @param {String} name
 * @return {Index}
 */

Store.prototype.index = function(name) {
  return this.indexes[name];
};

/**
 * Put (create or replace) `key` to `val`.
 *
 * @param {String|Object} [key] is optional when store.key exists.
 * @param {Any} val
 * @param {Function} cb
 */

Store.prototype.put = function(key, val, cb) {
  var name = this.name;
  var keyPath = this.key;
  if (keyPath) {
    if (type(key) == 'object') {
      cb = val;
      val = key;
      key = null;
    } else {
      val[keyPath] = key;
    }
  }

  this.db.transaction('readwrite', [name], function(err, tr) {
    if (err) return cb(err);
    var objectStore = tr.objectStore(name);
    var req = keyPath ? objectStore.put(val) : objectStore.put(val, key);
    tr.onerror = tr.onabort = req.onerror = cb;
    tr.oncomplete = function oncomplete() { cb() };
  });
};

/**
 * Get `key`.
 *
 * @param {String} key
 * @param {Function} cb
 */

Store.prototype.get = function(key, cb) {
  var name = this.name;
  this.db.transaction('readonly', [name], function(err, tr) {
    if (err) return cb(err);
    var objectStore = tr.objectStore(name);
    var req = objectStore.get(key);
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

/**
 * Del `key`.
 *
 * @param {String} key
 * @param {Function} cb
 */

Store.prototype.del = function(key, cb) {
  var name = this.name;
  this.db.transaction('readwrite', [name], function(err, tr) {
    if (err) return cb(err);
    var objectStore = tr.objectStore(name);
    var req = objectStore.delete(key);
    tr.onerror = tr.onabort = req.onerror = cb;
    tr.oncomplete = function oncomplete() { cb() };
  });
};

/**
 * Count.
 *
 * @param {Function} cb
 */

Store.prototype.count = function(cb) {
  var name = this.name;
  this.db.transaction('readonly', [name], function(err, tr) {
    if (err) return cb(err);
    var objectStore = tr.objectStore(name);
    var req = objectStore.count();
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

/**
 * Clear.
 *
 * @param {Function} cb
 */

Store.prototype.clear = function(cb) {
  var name = this.name;
  this.db.transaction('readwrite', [name], function(err, tr) {
    if (err) return cb(err);
    var objectStore = tr.objectStore(name);
    var req = objectStore.clear();
    tr.onerror = tr.onabort = req.onerror = cb;
    tr.oncomplete = function oncomplete() { cb() };
  });
};

/**
 * Perform batch operation.
 *
 * @param {Object} vals
 * @param {Function} cb
 */

Store.prototype.batch = function(vals, cb) {
  var name = this.name;
  var keyPath = this.key;
  var keys = Object.keys(vals);

  this.db.transaction('readwrite', [name], function(err, tr) {
    if (err) return cb(err);
    var store = tr.objectStore(name);
    var current = 0;
    tr.onerror = tr.onabort = cb;
    tr.oncomplete = function oncomplete() { cb() };
    next();

    function next() {
      if (current >= keys.length) return;
      var currentKey = keys[current];
      var currentVal = vals[currentKey];
      var req;

      if (currentVal === null) {
        req = store.delete(currentKey);
      } else if (keyPath) {
        req = store.put(currentVal);
      } else {
        req = store.put(currentVal, currentKey);
      }

      req.onerror = cb;
      req.onsuccess = next;
      current += 1;
    }
  });
};

/**
 * Get all.
 *
 * @param {Function} cb
 */

Store.prototype.all = function(cb) {
  var result = [];

  this.cursor({ iterator: iterator }, function(err) {
    err ? cb(err) : cb(null, result);
  });

  function iterator(cursor) {
    result.push(cursor.value);
    cursor.continue();
  }
};

/**
 * Create read cursor for specific `range`,
 * and pass IDBCursor to `iterator` function.
 * https://developer.mozilla.org/en-US/docs/Web/API/IDBCursor
 *
 * @param {Object} opts:
 *   {IDBRange|Null} range - passes to .openCursor()
 *   {Function} iterator - function to call with IDBCursor
 *   {String} [index] - name of index to start cursor by index
 * @param {Function} cb - calls on end or error
 */

Store.prototype.cursor = function(opts, cb) {
  var name = this.name;
  this.db.transaction('readonly', [name], function(err, tr) {
    if (err) return cb(err);
    var store = opts.index
      ? tr.objectStore(name).index(opts.index)
      : tr.objectStore(name);
    var req = store.openCursor(parseRange(opts.range));

    req.onerror = cb;
    req.onsuccess = function onsuccess(e) {
      var cursor = e.target.result;
      cursor ? opts.iterator(cursor) : cb();
    };
  });
};

});

require.register("treo/lib/idb-index.js", function (exports, module) {
var type = require("component~type@1.0.0");
var parseRange = require("treo/lib/range.js");

/**
 * Expose `Index`.
 */

module.exports = Index;

/**
 * Initialize new `Index`.
 *
 * @param {Store} store
 * @param {String} name
 * @param {String} field
 * @param {Object} opts { unique: false, multi: false }
 */

function Index(store, name, field, opts) {
  this.store = store;
  this.name = name;
  this.field = field;
  this.multi = opts.multi || false;
  this.unique = opts.unique || false;
}

/**
 * Get `key`.
 *
 * @param {String|IDBKeyRange} key
 * @param {Function} cb
 */

Index.prototype.get = function(key, cb) {
  var result = [];
  var isUnique = this.unique && type(key) == 'string';
  var opts = { range: key, iterator: iterator };

  this.cursor(opts, function(err) {
    if (err) return cb(err);
    isUnique ? cb(null, result[0]) : cb(null, result);
  });

  function iterator(cursor) {
    result.push(cursor.value);
    cursor.continue();
  }
};

/**
 * Count records by `key`.
 *
 * @param {String|IDBKeyRange} key
 * @param {Function} cb
 */

Index.prototype.count = function(key, cb) {
  var name = this.store.name;
  var indexName = this.name;

  this.store.db.transaction('readonly', [name], function(err, tr) {
    if (err) return cb(err);
    var index = tr.objectStore(name).index(indexName);
    var req = index.count(parseRange(key));
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

/**
 * Create cursor.
 * Proxy to `this.store` for convinience.
 *
 * @param {Object} opts
 * @param {Function} cb
 */

Index.prototype.cursor = function(opts, cb) {
  opts.index = this.name;
  this.store.cursor(opts, cb);
};

});

require.register("treo/lib/range.js", function (exports, module) {
var type = require("component~type@1.0.0");

/**
 * Link to `IDBKeyRange`.
 */

var IDBKeyRange = window.IDBKeyRange
  || window.webkitIDBKeyRange
  || window.msIDBKeyRange;

/**
 * Expose `parseRange()`.
 */

module.exports = parseRange;

/**
 * Parse key to valid range.
 * https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
 *
 * Available options (inspired by mongodb):
 *   gt: - greater
 *   lt: - lighter
 *   gte: - greater equal
 *   lte: - lighter equal
 *
 * @param {Object|Any} key
 * @return {IDBKeyRange}
 */

function parseRange(key) {
  if (!key) return;
  if (key instanceof IDBKeyRange) return key;
  if (type(key) != 'object') return IDBKeyRange.only(key);
  var keys = Object.keys(key).sort();

  if (keys.length == 1) {
    var val = key[keys[0]];
    switch (keys[0]) {
      case 'gt':  return IDBKeyRange.lowerBound(val, true);
      case 'lt':  return IDBKeyRange.upperBound(val, true);
      case 'gte': return IDBKeyRange.lowerBound(val);
      case 'lte': return IDBKeyRange.upperBound(val);
    }
  } else {
    var x = key[keys[0]];
    var y = key[keys[1]];

    switch (keys[0] + '-' + keys[1]) {
      case 'gt-lt':   return IDBKeyRange.bound(x, y, true, true);
      case 'gt-lte':  return IDBKeyRange.bound(x, y, true, false);
      case 'gte-lt':  return IDBKeyRange.bound(x, y, false, true);
      case 'gte-lte': return IDBKeyRange.bound(x, y, false, false);
    }
  }
}

});

if (typeof exports == "object") {
  module.exports = require("treo");
} else if (typeof define == "function" && define.amd) {
  define([], function(){ return require("treo"); });
} else {
  this["treo"] = require("treo");
}
})()
