
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

require.register("treo/lib/treo.js", function (exports, module) {
var type = require("component~type@1.0.0");
var Schema = require("treo/lib/schema.js");
var Store = require("treo/lib/store.js");
var Index = require("treo/lib/index.js");

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
  for (var key in this.stores) this.stores[key].db = this;
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

});

require.register("treo/lib/schema.js", function (exports, module) {
var type = require("component~type@1.0.0");
var Index = require("treo/lib/index.js");
var Store = require("treo/lib/store.js");

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
  this._indexes = {};
  this._stores = {};
  this._versions = {};
}

/**
 * Define new version.
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
 * @return {Schema}
 */

Schema.prototype.addStore = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (this._stores[name]) throw new TypeError('store is already defined');
  var store = new Store(name);

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
 * @param {Object} [opts] { unique: false }
 * @return {Schema}
 */

Schema.prototype.addIndex = function(name, field, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (type(field) != 'string') throw new TypeError('`field` is required');
  var store = this._current.store;
  var index = new Index(store, name, field, opts || {});
  if (this._indexes[store.name + '-' + name])
    throw new TypeError('index is already defined');

  this._versions[this.getVersion()].indexes.push(index);
  this._indexes[store.name + '-' + name] = index;
  return this;
};

/**
 * Get store.
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

/**
 * Generate callback for `upgradeneeded` event.
 *
 * @return {Function}
 */

Schema.prototype.callback = function() {
  var that = this;
  var versions = Object.keys(this._versions)
    .map(function(v) { return parseInt(v, 10) }).sort();

  return function onupgradeneeded(e) {
    var db = e.target.result;
    var tr = e.target.transaction;

    versions.forEach(function(version) {
      if (e.oldVersion >= version) return;
      var schema = that._versions[version];

      schema.stores.forEach(function(store) {
        db.createObjectStore(store.name);
      });

      schema.indexes.forEach(function(index) {
        var store = tr.objectStore(index.store.name);
        store.createIndex(index.name, index.field, index.opts);
      });
    });
  };
};

});

require.register("treo/lib/store.js", function (exports, module) {
var type = require("component~type@1.0.0");

/**
 * Expose `Store`.
 */

module.exports = Store;

/**
 * Initialize new `Store`.
 *
 * @param {name} String
 */

function Store(name) {
  this.name = name;
  this.indexes = {};
  this.db = null;
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
 * @param {Any|Object} key
 * @param {Any} val
 * @param {Function} cb
 */

Store.prototype.put =
Store.prototype.batch = function(key, val, cb) {
  var keys, vals;
  if (type(key) != 'object') {
    keys = [key];
    vals = {};
    vals[key] = val;
  } else {
    keys = Object.keys(key);
    vals = key;
    cb = val;
  }

  this.transaction('readwrite', function(err, tr, objectStore) {
    if (err) return cb(err);
    var current = 0;
    tr.onerror = tr.onabort = cb;
    tr.oncomplete = function oncomplete() { cb() };
    next();

    function next() {
      if (current >= keys.length) return;
      var currentKey = keys[current];
      var currentVal = vals[currentKey];

      var req = currentVal === null
        ? objectStore.delete(currentKey)
        : objectStore.put(currentVal, currentKey);

      req.onerror = cb;
      req.onsuccess = next;
      current += 1;
    }
  });
};

/**
 * Get `key`.
 *
 * @param {Any|Array} key
 * @param {Function} cb
 */

Store.prototype.get = function(key, cb) {
  var keys = type(key) == 'array' ? key : [key];

  this.transaction('readonly', function(err, tr, objectStore) {
    if (err) return cb(err);
    var result = [];
    var current = 0;
    next();

    function next() {
      if (current >= keys.length) return;
      var req = objectStore.get(keys[current]);
      current += 1;
      req.onerror = cb;
      req.onsuccess = function onsuccess(e) {
        if (type(key) != 'array') return cb(null, e.target.result);
        result.push(e.target.result);
        current == keys.length ? cb(null, result) : next();
      };
    }
  });
};

/**
 * Del `key`.
 *
 * @param {Any|Array} key
 * @param {Function} cb
 */

Store.prototype.del = function(key, cb) {
  var keys = type(key) == 'array' ? key : [key];

  this.transaction('readwrite', function(err, tr, objectStore) {
    if (err) return cb(err);
    var current = 0;
    tr.onerror = tr.onabort = cb;
    tr.oncomplete = function oncomplete() { cb() };
    next();

    function next() {
      if (current >= keys.length) return;
      var req = objectStore.delete(keys[current]);
      req.onerror = cb;
      req.onsuccess = next;
      current += 1;
    }
  });
};

/**
 * Count.
 *
 * @param {Function} cb
 */

Store.prototype.count = function(cb) {
  this.transaction('readonly', function(err, tr, objectStore) {
    if (err) return cb(err);
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
  this.transaction('readwrite', function(err, tr, objectStore) {
    if (err) return cb(err);
    var req = objectStore.clear();
    tr.onerror = tr.onabort = req.onerror = cb;
    tr.oncomplete = function oncomplete() { cb() };
  });
};

/**
 * Get all.
 *
 * @param {Function} cb
 */

Store.prototype.all = function(cb) {
  this.transaction('readonly', function(err, tr, objectStore) {
    if (err) return cb(err);
    var result = [];
    var req = objectStore.openCursor();
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) {
      var cursor = e.target.result;
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
 * Create new transaction.
 *
 * @param {Function} cb
 */

Store.prototype.transaction = function(type, cb) {
  var name = this.name;
  this.db.getInstance(function(err, db) {
    if (err) return cb(err);
    var tr = db.transaction([name], type);
    var store = tr.objectStore(name);
    cb(null, tr, store);
  });
};

});

require.register("treo/lib/index.js", function (exports, module) {

/**
 * Expose `Index`.
 */

module.exports = Index;

/**
 * `IDBKeyRange` reference.
 */

var IDBKeyRange = window.IDBKeyRange
  || window.webkitIDBKeyRange
  || window.msIDBKeyRange;

/**
 * Initialize new `Index`.
 *
 * @param {name} String
 */

function Index(store, name, field, opts) {
  this.store = store;
  this.store.indexes[name] = this;
  this.name = name;
  this.field = field;
  this.unique = opts.unique;
}

/**
 * Get `key`.
 */

Index.prototype.get = function(key, cb) {
  var that = this;

  this.store.transaction('readonly', function(err, tr, store) {
    if (err) return cb(err);
    var index = store.index(that.name);
    var result = [];
    var req;

    if (that.unique) {
      req = index.get(key);
      req.onerror = cb;
      req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
    } else {
      req = index.openCursor(IDBKeyRange.only(key));
      req.onerror = cb;
      req.onsuccess = function onsuccess(e) {
        var cursor = e.target.result;
        if (cursor) {
          result.push(cursor.value);
          cursor.continue();
        } else {
          cb(null, result);
        }
      };
    }
  });
};

/**
 * Count records by `key`.
 *
 * @param {Any} key
 * @param {Function} cb
 */

Index.prototype.count = function(key, cb) {
  var that = this;

  this.store.transaction('readonly', function(err, tr, store) {
    if (err) return cb(err);
    var index = store.index(that.name);
    var req = index.count(key);
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

});

if (typeof exports == "object") {
  module.exports = require("treo");
} else if (typeof define == "function" && define.amd) {
  define([], function(){ return require("treo"); });
} else {
  this["treo"] = require("treo");
}
})()
