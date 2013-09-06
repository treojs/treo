;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function requireIndexed(path, parent, orig) {
  var resolved = requireIndexed.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to requireIndexed "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.requireIndexed = true;
    throw err;
  }

  var module = requireIndexed.modules[resolved];

  // perform real requireIndexed()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, requireIndexed.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

requireIndexed.modules = {};

/**
 * Registered aliases.
 */

requireIndexed.aliases = {};

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

requireIndexed.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (requireIndexed.modules.hasOwnProperty(path)) return path;
    if (requireIndexed.aliases.hasOwnProperty(path)) return requireIndexed.aliases[path];
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

requireIndexed.normalize = function(curr, path) {
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

requireIndexed.register = function(path, definition) {
  requireIndexed.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

requireIndexed.alias = function(from, to) {
  if (!requireIndexed.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  requireIndexed.aliases[to] = from;
};

/**
 * Return a requireIndexed function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

requireIndexed.relative = function(parent) {
  var p = requireIndexed.normalize(parent, '..');

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
   * The relative requireIndexed() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return requireIndexed(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return requireIndexed.normalize(p, path);

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
    return requireIndexed.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
requireIndexed.register("timoxley-next-tick/index.js", function(exports, requireIndexed, module){
"use strict"

if (typeof setImmediate == 'function') {
  module.exports = function(f){ setImmediate(f) }
}
// legacy node.js
else if (typeof process != 'undefined' && typeof process.nextTick == 'function') {
  module.exports = process.nextTick
}
// fallback for other environments / postMessage behaves badly on IE8
else if (typeof window == 'undefined' || window.ActiveXObject || !window.postMessage) {
  module.exports = function(f){ setTimeout(f) };
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
requireIndexed.register("marcuswestin-store.js/store.js", function(exports, requireIndexed, module){
;(function(win){
	var store = {},
		doc = win.document,
		localStorageName = 'localStorage',
		namespace = '__storejs__',
		storage

	store.disabled = false
	store.set = function(key, value) {}
	store.get = function(key) {}
	store.remove = function(key) {}
	store.clear = function() {}
	store.transact = function(key, defaultVal, transactionFn) {
		var val = store.get(key)
		if (transactionFn == null) {
			transactionFn = defaultVal
			defaultVal = null
		}
		if (typeof val == 'undefined') { val = defaultVal || {} }
		transactionFn(val)
		store.set(key, val)
	}
	store.getAll = function() {}

	store.serialize = function(value) {
		return JSON.stringify(value)
	}
	store.deserialize = function(value) {
		if (typeof value != 'string') { return undefined }
		try { return JSON.parse(value) }
		catch(e) { return value || undefined }
	}

	// Functions to encapsulate questionable FireFox 3.6.13 behavior
	// when about.config::dom.storage.enabled === false
	// See https://github.com/marcuswestin/store.js/issues#issue/13
	function isLocalStorageNameSupported() {
		try { return (localStorageName in win && win[localStorageName]) }
		catch(err) { return false }
	}

	if (isLocalStorageNameSupported()) {
		storage = win[localStorageName]
		store.set = function(key, val) {
			if (val === undefined) { return store.remove(key) }
			storage.setItem(key, store.serialize(val))
			return val
		}
		store.get = function(key) { return store.deserialize(storage.getItem(key)) }
		store.remove = function(key) { storage.removeItem(key) }
		store.clear = function() { storage.clear() }
		store.getAll = function() {
			var ret = {}
			for (var i=0; i<storage.length; ++i) {
				var key = storage.key(i)
				ret[key] = store.get(key)
			}
			return ret
		}
	} else if (doc.documentElement.addBehavior) {
		var storageOwner,
			storageContainer
		// Since #userData storage applies only to specific paths, we need to
		// somehow link our data to a specific path.  We choose /favicon.ico
		// as a pretty safe option, since all browsers already make a request to
		// this URL anyway and being a 404 will not hurt us here.  We wrap an
		// iframe pointing to the favicon in an ActiveXObject(htmlfile) object
		// (see: http://msdn.microsoft.com/en-us/library/aa752574(v=VS.85).aspx)
		// since the iframe access rules appear to allow direct access and
		// manipulation of the document element, even for a 404 page.  This
		// document can be used instead of the current document (which would
		// have been limited to the current path) to perform #userData storage.
		try {
			storageContainer = new ActiveXObject('htmlfile')
			storageContainer.open()
			storageContainer.write('<s' + 'cript>document.w=window</s' + 'cript><iframe src="/favicon.ico"></iframe>')
			storageContainer.close()
			storageOwner = storageContainer.w.frames[0].document
			storage = storageOwner.createElement('div')
		} catch(e) {
			// somehow ActiveXObject instantiation failed (perhaps some special
			// security settings or otherwse), fall back to per-path storage
			storage = doc.createElement('div')
			storageOwner = doc.body
		}
		function withIEStorage(storeFunction) {
			return function() {
				var args = Array.prototype.slice.call(arguments, 0)
				args.unshift(storage)
				// See http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
				// and http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
				storageOwner.appendChild(storage)
				storage.addBehavior('#default#userData')
				storage.load(localStorageName)
				var result = storeFunction.apply(store, args)
				storageOwner.removeChild(storage)
				return result
			}
		}

		// In IE7, keys may not contain special chars. See all of https://github.com/marcuswestin/store.js/issues/40
		var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")
		function ieKeyFix(key) {
			return key.replace(forbiddenCharsRegex, '___')
		}
		store.set = withIEStorage(function(storage, key, val) {
			key = ieKeyFix(key)
			if (val === undefined) { return store.remove(key) }
			storage.setAttribute(key, store.serialize(val))
			storage.save(localStorageName)
			return val
		})
		store.get = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			return store.deserialize(storage.getAttribute(key))
		})
		store.remove = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			storage.removeAttribute(key)
			storage.save(localStorageName)
		})
		store.clear = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			storage.load(localStorageName)
			for (var i=0, attr; attr=attributes[i]; i++) {
				storage.removeAttribute(attr.name)
			}
			storage.save(localStorageName)
		})
		store.getAll = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			var ret = {}
			for (var i=0, attr; attr=attributes[i]; ++i) {
				var key = ieKeyFix(attr.name)
				ret[attr.name] = store.deserialize(storage.getAttribute(key))
			}
			return ret
		})
	}

	try {
		store.set(namespace, namespace)
		if (store.get(namespace) != namespace) { store.disabled = true }
		store.remove(namespace)
	} catch(e) {
		store.disabled = true
	}
	store.enabled = !store.disabled
	if (typeof module != 'undefined' && module.exports) { module.exports = store }
	else if (typeof define === 'function' && define.amd) { define(store) }
	else { win.store = store }
})(this.window || global);

});
requireIndexed.register("component-clone/index.js", function(exports, requireIndexed, module){

/**
 * Module dependencies.
 */

var type;

try {
  type = requireIndexed('type');
} catch(e){
  type = requireIndexed('type-component');
}

/**
 * Module exports.
 */

module.exports = clone;

/**
 * Clones objects.
 *
 * @param {Mixed} any object
 * @api public
 */

function clone(obj){
  switch (type(obj)) {
    case 'object':
      var copy = {};
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          copy[key] = clone(obj[key]);
        }
      }
      return copy;

    case 'array':
      var copy = new Array(obj.length);
      for (var i = 0, l = obj.length; i < l; i++) {
        copy[i] = clone(obj[i]);
      }
      return copy;

    case 'regexp':
      // from millermedeiros/amd-utils - MIT
      var flags = '';
      flags += obj.multiline ? 'm' : '';
      flags += obj.global ? 'g' : '';
      flags += obj.ignoreCase ? 'i' : '';
      return new RegExp(obj.source, flags);

    case 'date':
      return new Date(obj.getTime());

    default: // string, number, boolean, …
      return obj;
  }
}

});
requireIndexed.register("component-type/index.js", function(exports, requireIndexed, module){

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
requireIndexed.register("component-to-function/index.js", function(exports, requireIndexed, module){

/**
 * Expose `toFunction()`.
 */

module.exports = toFunction;

/**
 * Convert `obj` to a `Function`.
 *
 * @param {Mixed} obj
 * @return {Function}
 * @api private
 */

function toFunction(obj) {
  switch ({}.toString.call(obj)) {
    case '[object Object]':
      return objectToFunction(obj);
    case '[object Function]':
      return obj;
    case '[object String]':
      return stringToFunction(obj);
    case '[object RegExp]':
      return regexpToFunction(obj);
    default:
      return defaultToFunction(obj);
  }
}

/**
 * Default to strict equality.
 *
 * @param {Mixed} val
 * @return {Function}
 * @api private
 */

function defaultToFunction(val) {
  return function(obj){
    return val === obj;
  }
}

/**
 * Convert `re` to a function.
 *
 * @param {RegExp} re
 * @return {Function}
 * @api private
 */

function regexpToFunction(re) {
  return function(obj){
    return re.test(obj);
  }
}

/**
 * Convert property `str` to a function.
 *
 * @param {String} str
 * @return {Function}
 * @api private
 */

function stringToFunction(str) {
  // immediate such as "> 20"
  if (/^ *\W+/.test(str)) return new Function('_', 'return _ ' + str);

  // properties such as "name.first" or "age > 18"
  return new Function('_', 'return _.' + str);
}

/**
 * Convert `object` to a function.
 *
 * @param {Object} object
 * @return {Function}
 * @api private
 */

function objectToFunction(obj) {
  var match = {}
  for (var key in obj) {
    match[key] = typeof obj[key] === 'string'
      ? defaultToFunction(obj[key])
      : toFunction(obj[key])
  }
  return function(val){
    if (typeof val !== 'object') return false;
    for (var key in match) {
      if (!(key in val)) return false;
      if (!match[key](val[key])) return false;
    }
    return true;
  }
}

});
requireIndexed.register("component-each/index.js", function(exports, requireIndexed, module){

/**
 * Module dependencies.
 */

var toFunction = requireIndexed('to-function');
var type;

try {
  type = requireIndexed('type-component');
} catch (e) {
  type = requireIndexed('type');
}

/**
 * HOP reference.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Iterate the given `obj` and invoke `fn(val, i)`.
 *
 * @param {String|Array|Object} obj
 * @param {Function} fn
 * @api public
 */

module.exports = function(obj, fn){
  fn = toFunction(fn);
  switch (type(obj)) {
    case 'array':
      return array(obj, fn);
    case 'object':
      if ('number' == typeof obj.length) return array(obj, fn);
      return object(obj, fn);
    case 'string':
      return string(obj, fn);
  }
};

/**
 * Iterate string chars.
 *
 * @param {String} obj
 * @param {Function} fn
 * @api private
 */

function string(obj, fn) {
  for (var i = 0; i < obj.length; ++i) {
    fn(obj.charAt(i), i);
  }
}

/**
 * Iterate object keys.
 *
 * @param {Object} obj
 * @param {Function} fn
 * @api private
 */

function object(obj, fn) {
  for (var key in obj) {
    if (has.call(obj, key)) {
      fn(key, obj[key]);
    }
  }
}

/**
 * Iterate array-ish.
 *
 * @param {Array|Object} obj
 * @param {Function} fn
 * @api private
 */

function array(obj, fn) {
  for (var i = 0; i < obj.length; ++i) {
    fn(obj[i], i);
  }
}

});
requireIndexed.register("indexed/index.js", function(exports, requireIndexed, module){
var Indexed  = requireIndexed('./lib/indexeddb');
module.exports = Indexed.supported ? Indexed : requireIndexed('./lib/localstorage');

});
requireIndexed.register("indexed/lib/indexeddb.js", function(exports, requireIndexed, module){
/**
 * Local variables.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var clone     = requireIndexed('clone');
var indexOf   = Array.prototype.indexOf;
var slice     = Array.prototype.slice;
var dbs       = {};
var configs   = {};

/**
 * Expose `Indexed`.
 */

module.exports = Indexed;

/**
 * Construtor to wrap IndexedDB API with nice async methods.
 * `name` contains db-name and store-name splited with colon.
 *
 * Example:
 *
 *   // connect to db with name `notepad`, use store `notes`
 *   // use _id field as a key
 *   var indexed = new Indexed('notepad:notes', { key: '_id' });
 *
 * @options {String} name
 * @options {Object} options
 * @api public
 */

function Indexed(name, options) {
  if (typeof name !== 'string') throw new TypeError('name requireIndexedd');
  if (!options) options = {};
  var params = name.split(':');

  this.dbName    = params[0];
  this.name      = params[1];
  this.key       = options.key || 'id';
  this.connected = false;
}

/**
 * Drop IndexedDB instance by name.
 * Shortcut for `indexedDB.deleteDatabase`
 *
 * @options {String} `dbName`
 * @options {function} cb
 * @api public
 */

Indexed.dropDb = function(dbName, cb) {
  if (dbs[dbName]) db.close();
  delete configs[dbName];
  delete dbs[dbName];
  request(indexedDB.deleteDatabase(dbName), cb);
};


/**
 * This flag incicates about support of latest IndexedDB standart.
 *
 *
 * Indexed tryes to build on top of latest standart http://www.w3.org/TR/2013/CR-IndexedDB-20130704/,
 * so it works on Chrome 25+, IE10+, FF13+.
 * The reasons for this requireIndexedments are `2-parameter open` and `string values for transaction modes`.
 * Check https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase#Browser_Compatibility
 * for irrefragable answer.
 */

Indexed.supported = (function() {
  var IDBDatabase       = window.IDBDatabase || window.webkitIDBDatabase;
  var IDBTransaction    = window.IDBTransaction || window.webkitIDBTransaction;
  var hasOnUpgradeEvent = IDBDatabase && ! IDBDatabase.prototype.setVersion;
  var hasStringModes    = IDBTransaction && IDBTransaction.READ_WRITE !== 1;
  var hasIndexedDB      = !! indexedDB;

  return hasIndexedDB && hasOnUpgradeEvent && hasStringModes;
}).call(this);

/**
 * Get all values from the object store.
 *
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.all = transaction('readonly', function(store, tr, cb) {
  var result = [];
  request(store.openCursor(), function(err) {
    var cursor = this.result;
    if (cursor) {
      result.push(cursor.value);
      cursor['continue']();
    } else {
      cb(null, result);
    }
  });
});

/**
 * Get object by `key`.
 *
 * @options {Mixin} key
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.get = transaction('readonly', function(store, tr, key, cb) {
  request(store.get(key), function(err) {
    cb(err, this.result);
  });
});

/**
 * Clear object store.
 *
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.clear = transaction('readwrite', function(store, tr, cb) {
  request(store.clear(), tr, cb);
});

/**
 * Delete object by `key`.
 *
 * @options {Mixin} key
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.del = transaction('readwrite', function(store, tr, key, cb) {
  request(store['delete'](key), tr, cb);
});

/**
 * Put - replace or create object by `key` with `val`.
 * Extends `val` with `key` automatically.
 *
 * @options {Mixin} key
 * @options {Mixin} val
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.put = transaction('readwrite', function(store, tr, key, val, cb) {
  val[this.key] = key;
  request(store.put(val), tr, function(err) {
    cb(err, val);
  });
});

/**
 * Creates new transaction and returns object store.
 *
 * @options {String} mode - readwrite|readonly
 * @options {Function} cb
 * @api private
 */

Indexed.prototype._getStore = function(mode, cb) {
  this._getDb(function(err, db) {
    if (err) return cb(err);

    var transaction = db.transaction(this.name, mode);
    var objectStore = transaction.objectStore(this.name);
    cb.call(this, null, objectStore, transaction);
  });
};

/**
 * Returns db instance, performs connection and upgrade if needed.
 *
 * @options {Function} cb
 * @api private
 */

Indexed.prototype._getDb = function(cb) {
  var that = this;
  var db   = dbs[this.dbName];

  if (db) {
    if (this.connected) return cb.call(that, null, db);
    this._connectOrUpgrade(db, cb);
  } else {
    request(indexedDB.open(this.dbName), function(err) {
      if (err) return cb(err);

      dbs[that.dbName] = this.result;
      that._connectOrUpgrade(this.result, cb);
    });
  }
};

/**
 * Check that `db.version` is equal to config version or
 * Performs connect or db upgrade.
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
    cb.call(this, null, db);
  }
};

/**
 * Close current db connection and open new.
 * Create object store if needed and recreate it when keyPath changed.
 *
 * @options {Object} db
 * @options {Function} cb
 * @api private
 */

Indexed.prototype._upgrade = function(db, cb) {
  var that   = this;
  var config = this._getUpgradeConfig(db, true);

  db.close();
  var req = request(indexedDB.open(this.dbName, config.version), function(err) {
    if (err) return cb(err);

    dbs[that.dbName] = this.result;
    that.connected = true;
    cb.call(that, null, this.result);
  });

  req.onupgradeneeded = function(event) {
    if (config.action === 'recreate') this.result.deleteObjectStore(that.name);
    if (config.action) this.result.createObjectStore(that.name, { keyPath: that.key });
  };
};

/**
 * Returns config for upgrade of `db`: new version and action.
 * Prefers info from db to stored config.
 * Backup config to localStorage when `save` is true.
 *
 * @options {Object} db
 * @options {Boolean} save
 * @api private
 */

Indexed.prototype._getUpgradeConfig = function(db, save) {
  var defaults = { version: db.version || 1, stores: [], keys: {} };
  var config   = clone(configs[this.dbName] || defaults);
  var action   = null;

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

  if (save) configs[this.dbName] = config;
  return { version: config.version, action: action };
};


/**
 * Helper to simplify requests to IndexedDB API.
 * Helps to manage errors, and `onsuccess` and `oncomplete` events
 *
 * @options {Function} method - ready to call request
 * @options {IDBTransaction} tr
 * @options {Function} cb
 * @return {IDBRequest} req
 */

function request(req, tr, cb) {
  req.onerror = function(event) { cb.call(this, event); };

  if (!cb)
    req.onsuccess = function(event) { tr.call(this, null); };
  else
    tr.oncomplete = function(event) { cb.call(this, null); };

  return req;
}

/**
 * Helper to force new transaction for current store.
 *
 * @options {String} mode {readwrite|readonly}
 * @options {Function} handler
 * @return {Function}
 */

function transaction(mode, handler) {
  return function() {
    var args = slice.call(arguments, 0);
    var cb   = args[args.length - 1];

    this._getStore(mode, function(err, store, tr) {
      if (err) return cb(err);
      handler.apply(this, [store, tr].concat(args));
    });
  };
}

});
requireIndexed.register("indexed/lib/localstorage.js", function(exports, requireIndexed, module){

/**
 * Module dependencies.
 */

var store        = requireIndexed('store');
var each         = requireIndexed('each');
var setImmediate = requireIndexed('next-tick');
var slice        = Array.prototype.slice;

/**
 * Expose `Indexed`.
 */

module.exports = Indexed;

/**
 * Wrap localStorage to async API.
 * TODO: DRY constructor with indexeddb
 * TODO: control consistent of store names
 *
 * @options {String} name
 * @options {Object} options
 * @api public
 */

function Indexed(name, options) {
  if (typeof name !== 'string') throw new TypeError('name requireIndexedd');
  if (!options) options = {};
  var params = name.split(':');

  this.dbName    = params[0];
  this.name      = params[1];
  this.key       = options.key || 'id';
  this.connected = true;
  this._validateKey();
}

// TODO: control DB names
// TODO: DRY with clear
Indexed.dropDb = function(name, cb) {
  each(store.getAll(), function(key, val) {
    if (key.indexOf(name) === 0) store.remove(key);
  });
  if (cb) setImmediate(cb);
};

// Always supported
Indexed.supported = store.enabled;

/**
 * Returns all values from the store.
 *
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.all = async(function() {
  var result = [];
  var values = store.getAll();
  var name   = this._name();

  each(values, function(key, val) {
    if (key.indexOf(name) === 0) result.push(val);
  });
  return result;
});

/**
 * Get object by `key`.
 *
 * @options {Mixin} key
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.get = async(function(key) {
  return store.get(this._key(key));
});

/**
 * Put - replace or create object by `key` with `val`.
 *
 * @options {Mixin} key
 * @options {Mixin} val
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.put = async(function(key, val) {
  val[this.key] = key;
  return store.set(this._key(key), val);
});

/**
 * Delete object by `key`.
 *
 * @options {Mixin} key
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.del = async(function(key) {
  store.remove(this._key(key));
});

/**
 * Clear store.
 *
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.clear = async(function() {
  var values = store.getAll();
  var name   = this._name();

  each(values, function(key, val) {
    if (key.indexOf(name) === 0) store.remove(key);
  });
});

/**
 * Handle key
 *
 * @options {Mixin} key
 * @return {String}
 * @api private
 */

Indexed.prototype._key = function(key) {
  if (typeof key !== 'string') key = JSON.stringify(key);
  return this._name() + key;
};

/**
 * Returns storage namespace
 *
 * @return {String}
 * @api private
 */

Indexed.prototype._name = function() {
  return this.dbName + ':' + this.name + ':';
};

/**
 * Validate keyPath, and if it changed recreate the store
 */

Indexed.prototype._validateKey = function() {
  var keys       = store.get('.indexed-keys') || {};
  var name       = this._name();
  var currentKey = keys[name];

  if (currentKey && currentKey !== this.key) Indexed.dropDb(name);
  if (!currentKey || currentKey !== this.key) {
    keys[name] = this.key;
    store.set('.indexed-keys', keys);
  }
};

/**
 * Helper to emulate async call.
 * Essential for all methods.
 */

function async(getVal) {
  return function() {
    var that = this;
    var args = slice.call(arguments, 0);
    var cb   = args[args.length - 1];

    setImmediate(function() {
      try {
        var res = getVal.apply(that, args.slice(0, -1));
        res ? cb(null, res) : cb(null);
      } catch (err) {
        cb(err);
      }
    });
  };
}

});





requireIndexed.alias("timoxley-next-tick/index.js", "indexed/deps/next-tick/index.js");
requireIndexed.alias("timoxley-next-tick/index.js", "next-tick/index.js");

requireIndexed.alias("marcuswestin-store.js/store.js", "indexed/deps/store/store.js");
requireIndexed.alias("marcuswestin-store.js/store.js", "indexed/deps/store/index.js");
requireIndexed.alias("marcuswestin-store.js/store.js", "store/index.js");
requireIndexed.alias("marcuswestin-store.js/store.js", "marcuswestin-store.js/index.js");
requireIndexed.alias("component-clone/index.js", "indexed/deps/clone/index.js");
requireIndexed.alias("component-clone/index.js", "clone/index.js");
requireIndexed.alias("component-type/index.js", "component-clone/deps/type/index.js");

requireIndexed.alias("component-type/index.js", "indexed/deps/type/index.js");
requireIndexed.alias("component-type/index.js", "type/index.js");

requireIndexed.alias("component-each/index.js", "indexed/deps/each/index.js");
requireIndexed.alias("component-each/index.js", "each/index.js");
requireIndexed.alias("component-to-function/index.js", "component-each/deps/to-function/index.js");

requireIndexed.alias("component-type/index.js", "component-each/deps/type/index.js");

requireIndexed.alias("indexed/index.js", "indexed/index.js");if (typeof exports == "object") {
  module.exports = requireIndexed("indexed");
} else if (typeof define == "function" && define.amd) {
  define(function(){ return requireIndexed("indexed"); });
} else {
  this["Indexed"] = requireIndexed("indexed");
}})();