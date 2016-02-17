(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.treo = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],2:[function(require,module,exports){
(function (global){
'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = batch;

var _isPlainObj = require('is-plain-obj');

var _isPlainObj2 = _interopRequireDefault(_isPlainObj);

var _isSafari = require('is-safari');

var _isSafari2 = _interopRequireDefault(_isSafari);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Links to array prototype methods.
 */

var slice = [].slice;
var map = [].map;

/**
 * Perform batch operation using `ops`.
 *
 * Array syntax:
 *
 * [
 *   { type: 'add', key: 'key1', val: 'val1' },
 *   { type: 'put', key: 'key2', val: 'val2' },
 *   { type: 'del', key: 'key3' },
 * ]
 *
 * Object syntax:
 *
 * {
 * 	 key1: 'val1', // put val1 to key1
 * 	 key2: 'val2', // put val2 to key2
 * 	 key3: null,   // delete key
 * }
 *
 * @param {Array|Object} ops
 * @return {Promise}
 */

function batch(db, storeName, ops) {
  if (arguments.length !== 3) throw new TypeError('invalid arguments length');
  if (typeof storeName !== 'string') throw new TypeError('invalid "storeName"');
  if (!Array.isArray(ops) && !(0, _isPlainObj2.default)(ops)) throw new TypeError('invalid "ops"');
  if ((0, _isPlainObj2.default)(ops)) {
    ops = Object.keys(ops).map(function (key) {
      return { key: key, value: ops[key], type: ops[key] === null ? 'del' : 'put' };
    });
  }
  ops.forEach(function (op) {
    if (!(0, _isPlainObj2.default)(op)) throw new TypeError('invalid op');
    if (['add', 'put', 'del'].indexOf(op.type) === -1) throw new TypeError('invalid type "' + op.type + '"');
  });

  return new Promise(function (resolve, reject) {
    var tr = db.transaction(storeName, 'readwrite');
    var store = tr.objectStore(storeName);
    var results = [];
    var currentIndex = 0;

    tr.onerror = handleError(reject);
    tr.oncomplete = function () {
      return resolve(results);
    };
    next();

    function next() {
      var _ops$currentIndex = ops[currentIndex];
      var type = _ops$currentIndex.type;
      var key = _ops$currentIndex.key;

      if (type === 'del') return request(store.delete(key));

      var val = ops[currentIndex].val || ops[currentIndex].value;
      if (key && store.keyPath) val[store.keyPath] = key;

      countUniqueIndexes(store, key, val, function (err, uniqueRecordsCounter) {
        if (err) return reject(err);

        // we don't abort transaction here, and just stops execution
        // browsers implementation also don't abort, and just throw an error
        if (uniqueRecordsCounter) return reject(new Error('Unique index ConstraintError'));
        request(store.keyPath ? store[type](val) : store[type](val, key));
      });
    }

    function request(req) {
      currentIndex += 1;

      req.onerror = handleError(reject);
      req.onsuccess = function (e) {
        results.push(e.target.result);
        if (currentIndex < ops.length) next();
      };
    }
  });
}

/**
 * Validate unique index manually.
 *
 * Fixing:
 * - https://bugs.webkit.org/show_bug.cgi?id=149107
 * - https://github.com/axemclion/IndexedDBShim/issues/56
 *
 * @param {IDBStore} store
 * @param {Any} val
 * @param {Function} cb(err, uniqueRecordsCounter)
 */

function countUniqueIndexes(store, key, val, cb) {
  // rely on native support
  if (!_isSafari2.default && global.indexedDB !== global.shimIndexedDB) return cb();

  var indexes = slice.call(store.indexNames).map(function (indexName) {
    var index = store.index(indexName);
    var indexVal = isCompound(index) ? map.call(index.keyPath, function (indexKey) {
      return val[indexKey];
    }).filter(function (v) {
      return Boolean(v);
    }) : val[index.keyPath];

    return [index, indexVal];
  }).filter(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2);

    var index = _ref2[0];
    var indexVal = _ref2[1];

    return index.unique && (isCompound(index) ? indexVal.length : indexVal);
  });

  if (!indexes.length) return cb();

  var totalRequestsCounter = indexes.length;
  var uniqueRecordsCounter = 0;

  indexes.forEach(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 2);

    var index = _ref4[0];
    var indexVal = _ref4[1];

    var req = index.getKey(indexVal); // get primaryKey to compare with updating value
    req.onerror = handleError(cb);
    req.onsuccess = function (e) {
      if (e.target.result && e.target.result !== key) uniqueRecordsCounter += 1;
      totalRequestsCounter -= 1;
      if (totalRequestsCounter === 0) cb(null, uniqueRecordsCounter);
    };
  });
}

/**
 * Check if `index` is compound
 *
 * @param {IDBIndex} index
 * @return {Boolean}
 */

function isCompound(index) {
  return typeof index.keyPath !== 'string';
}

/**
 * Create error handler.
 *
 * @param {Function} cb
 * @return {Function}
 */

function handleError(cb) {
  return function (e) {
    // prevent global error throw https://bugzilla.mozilla.org/show_bug.cgi?id=872873
    if (typeof e.preventDefault === 'function') e.preventDefault();
    cb(e.target.error);
  };
}
module.exports = exports['default'];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"is-plain-obj":6,"is-safari":7}],3:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.open = open;
exports.del = del;
exports.cmp = cmp;

/**
 * Open IndexedDB database with `name`.
 * Retry logic allows to avoid issues in tests env,
 * when db with the same name delete/open repeatedly and can be blocked.
 *
 * @param {String} dbName
 * @param {Number} [version]
 * @param {Function} [upgradeCallback]
 * @return {Promise}
 */

function open(dbName, version, upgradeCallback) {
  return new Promise(function (resolve, reject) {
    var isFirst = true;
    var openDb = function openDb() {
      // don't call open with 2 arguments, when version is not set
      var req = version ? idb().open(dbName, version) : idb().open(dbName);
      req.onblocked = function () {
        if (isFirst) {
          isFirst = false;
          setTimeout(openDb, 100);
        } else {
          reject(new Error('database is blocked'));
        }
      };
      if (typeof upgradeCallback === 'function') req.onupgradeneeded = upgradeCallback;
      req.onerror = function (e) {
        return reject(e.target.error);
      };
      req.onsuccess = function (e) {
        return resolve(e.target.result);
      };
    };
    openDb();
  });
}

/**
 * Delete `db` properly:
 * - close it and wait 100ms to disk flush (Safari, older Chrome, Firefox)
 * - if database is locked, due to inconsistent exectution of `versionchange`,
 *   try again in 100ms
 *
 * @param {IDBDatabase|String} db
 * @return {Promise}
 */

function del(db) {
  var dbName = typeof db !== 'string' ? db.name : db;

  return new Promise(function (resolve, reject) {
    var isFirst = true;
    var delDb = function delDb() {
      var req = idb().deleteDatabase(dbName);
      req.onblocked = function () {
        if (isFirst) {
          isFirst = false;
          setTimeout(delDb, 100);
        } else {
          reject(new Error('database is blocked'));
        }
      };
      req.onerror = function (e) {
        return reject(e.target.error);
      };
      req.onsuccess = function () {
        return resolve();
      };
    };

    if (typeof db !== 'string') {
      db.close();
      setTimeout(delDb, 100);
    } else {
      delDb();
    }
  });
}

/**
 * Compare `first` and `second`.
 * Added for consistency with official API.
 *
 * @param {Any} first
 * @param {Any} second
 * @return {Number} -1|0|1
 */

function cmp(first, second) {
  return idb().cmp(first, second);
}

/**
 * Get globally available IDBFactory instance.
 * - it uses `global`, so it can work in any env.
 * - it tries to use `global.forceIndexedDB` first,
 *   so you can rewrite `global.indexedDB` with polyfill
 *   https://bugs.webkit.org/show_bug.cgi?id=137034
 * - it fallbacks to all possibly available implementations
 *   https://github.com/axemclion/IndexedDBShim#ios
 * - function allows to have dynamic link,
 *   which can be changed after module's initial exectution
 *
 * @return {IDBFactory}
 */

function idb() {
  return global.forceIndexedDB || global.indexedDB || global.webkitIndexedDB || global.mozIndexedDB || global.msIndexedDB || global.shimIndexedDB;
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = range;

var _isPlainObj = require('is-plain-obj');

var _isPlainObj2 = _interopRequireDefault(_isPlainObj);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Parse `opts` to valid IDBKeyRange.
 * https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
 *
 * @param {Object} opts
 * @return {IDBKeyRange}
 */

function range(opts) {
  var IDBKeyRange = global.IDBKeyRange || global.webkitIDBKeyRange;
  if (opts instanceof IDBKeyRange) return opts;
  if (typeof opts === 'undefined' || opts === null) return null;
  if (!(0, _isPlainObj2.default)(opts)) return IDBKeyRange.only(opts);
  var keys = Object.keys(opts).sort();

  if (keys.length === 1) {
    var key = keys[0];
    var val = opts[key];

    switch (key) {
      case 'eq':
        return IDBKeyRange.only(val);
      case 'gt':
        return IDBKeyRange.lowerBound(val, true);
      case 'lt':
        return IDBKeyRange.upperBound(val, true);
      case 'gte':
        return IDBKeyRange.lowerBound(val);
      case 'lte':
        return IDBKeyRange.upperBound(val);
      default:
        throw new TypeError('"' + key + '" is not valid key');
    }
  } else {
    var x = opts[keys[0]];
    var y = opts[keys[1]];
    var pattern = keys.join('-');

    switch (pattern) {
      case 'gt-lt':
        return IDBKeyRange.bound(x, y, true, true);
      case 'gt-lte':
        return IDBKeyRange.bound(x, y, true, false);
      case 'gte-lt':
        return IDBKeyRange.bound(x, y, false, true);
      case 'gte-lte':
        return IDBKeyRange.bound(x, y, false, false);
      default:
        throw new TypeError('"' + pattern + '" are conflicted keys');
    }
  }
}
module.exports = exports['default'];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"is-plain-obj":6}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.request = request;
exports.requestTransaction = requestTransaction;
exports.requestCursor = requestCursor;
exports.mapCursor = mapCursor;

/**
 * Transform IDBRequest to `Promise`,
 * which resolves on `success` or on `complete` when `tr` passed.
 *
 * @param {IDBRequest|IDBOpenDBRequest} req
 * @param {IDBTransaction} [tr]
 * @return {Promise}
 */

function request(req) {
  var tr = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

  var result = undefined;
  return new Promise(function (resolve, reject) {
    req.onerror = handleError(reject);
    req.onsuccess = function (e) {
      result = e.target.result;
      if (!tr) resolve(e.target.result);
    };
    if (tr) tr.oncomplete = function () {
      return resolve(result);
    };
  });
}

/**
 * Transform `tr` to `Promise`.
 *
 * @param {IDBTransaction} tr
 * @return {Promise}
 */

function requestTransaction(tr) {
  return new Promise(function (resolve, reject) {
    tr.onerror = handleError(reject);
    tr.oncomplete = function () {
      return resolve();
    };
  });
}

/**
 * Call `iterator` for each `onsuccess` event.
 *
 * @param {IDBRequest} req
 * @param {Function} iterator
 * @return {Promise}
 */

function requestCursor(req, iterator) {
  // patch iterator to fix:
  // https://github.com/axemclion/IndexedDBShim/issues/204

  var keys = {}; // count unique keys
  var patchedIterator = function patchedIterator(cursor) {
    if ((cursor.direction === 'prevunique' || cursor.direction === 'nextunique') && !cursor.source.multiEntry) {
      if (!keys[cursor.key]) {
        keys[cursor.key] = true;
        iterator(cursor);
      } else {
        cursor.continue();
      }
    } else {
      iterator(cursor);
    }
  };

  return new Promise(function (resolve, reject) {
    req.onerror = handleError(reject);
    req.onsuccess = function (e) {
      var cursor = e.target.result;
      if (cursor) {
        patchedIterator(cursor);
      } else {
        resolve();
      }
    };
  });
}

/**
 * Special helper to map values over cursor.
 *
 * @param {IDBRequest} req
 * @param {Function} iterator
 * @return {Promise}
 */

function mapCursor(req, iterator) {
  var result = [];
  return requestCursor(req, function (cursor) {
    return iterator(cursor, result);
  }).then(function () {
    return result;
  });
}

/**
 * Helper to handle errors and call `reject`.
 *
 * @param {Function} reject - from Promise constructor
 * @return {Function}
 */

function handleError(reject) {
  return function (e) {
    // prevent global error throw https://bugzilla.mozilla.org/show_bug.cgi?id=872873
    if (typeof e.preventDefault === 'function') e.preventDefault();
    reject(e.target.error);
  };
}
},{}],6:[function(require,module,exports){
'use strict';
var toString = Object.prototype.toString;

module.exports = function (x) {
	var prototype;
	return toString.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
};

},{}],7:[function(require,module,exports){
'use strict';
module.exports = typeof navigator !== 'undefined' && /Version\/[\d\.]+.*Safari/.test(navigator.userAgent);

},{}],8:[function(require,module,exports){
(function (global){
var Emitter = require('component-emitter')
var emit = Emitter.prototype.emit

/**
 * Use communication `KEY` to ignore other localStorage changes.
 */

var KEY = '!!storage-emitter-key'

/**
 * Initialize an `Emitter` instance.
 */

var sEmitter = new Emitter()

/**
* Register `storage` event listener to DefaultView<window> target.
* https://developer.mozilla.org/en-US/docs/Web/Events/storage
*
* @param {StorageEvent} e { key, newValue }
*/

global.addEventListener('storage', function onStorage(e) {
  if (e.key != KEY) return // ignore other keys
  if (!e.newValue) return // removeItem
  try {
    var cmd = JSON.parse(e.newValue)
    sEmitter.listeners(cmd.event).forEach(function(callback) {
      callback.call(sEmitter, cmd.args)
    })
  } catch(err) {
    console.error('unexpected value: ' + err.newValue)
  }
}, false)

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} args
 * @return {StorageEmitter}
 */

sEmitter.emit = function(event, args) {
  var cmd = JSON.stringify({ event: event, args: args })
  localStorage.setItem(KEY, cmd)
  localStorage.removeItem(KEY)
  return emit.apply(this, arguments)
}

/**
 * Expose `sEmitter`.
 */

module.exports = sEmitter

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"component-emitter":1}],9:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _componentEmitter = require('component-emitter');

var _componentEmitter2 = _interopRequireDefault(_componentEmitter);

var _idbFactory = require('idb-factory');

var _storageEmitter = require('storage-emitter');

var _storageEmitter2 = _interopRequireDefault(_storageEmitter);

var _idbStore = require('./idb-store');

var _idbStore2 = _interopRequireDefault(_idbStore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Database = function (_Emitter) {
  _inherits(Database, _Emitter);

  /**
   * Initialize new `Database` instance.
   *
   * @param {IDBDatabase} db
   */

  function Database(db) {
    _classCallCheck(this, Database);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Database).call(this));

    _this.db = db;
    _this.db.onerror = function (e) {
      _this.emit('error', e.target.error);
    };
    _this.db.onversionchange = function () {
      _this.close();
      _this.emit('versionchange');
    };
    _storageEmitter2.default.once('versionchange', function (_ref) {
      var name = _ref.name;
      var version = _ref.version;
      var isDelete = _ref.isDelete;

      if (name === _this.name && (version > _this.version || isDelete)) {
        _this.close();
        _this.emit('versionchange');
      }
    });
    _this.stores.forEach(function (storeName) {
      if (typeof _this[storeName] !== 'undefined') return;
      Object.defineProperty(_this, storeName, {
        get: function get() {
          return this.store(storeName);
        }
      });
    });
    return _this;
  }

  /**
   * Getters.
   */

  _createClass(Database, [{
    key: 'store',

    /**
     * Get store by `name`.
     *
     * @param {String} name
     * @return {Store}
     */

    value: function store(name) {
      if (this.stores.indexOf(name) === -1) throw new TypeError('"' + name + '" store does not exist');
      return new _idbStore2.default(this.db, name);
    }

    /**
     * Delete database.
     *
     * @return {Promise}
     */

  }, {
    key: 'del',
    value: function del() {
      _storageEmitter2.default.emit('versionchange', { name: this.name, isDelete: true });
      return (0, _idbFactory.del)(this.db);
    }

    /**
     * Close database.
     */

  }, {
    key: 'close',
    value: function close() {
      this.db.close();
      this.emit('close');
    }
  }, {
    key: 'name',
    get: function get() {
      return this.db.name;
    }
  }, {
    key: 'version',
    get: function get() {
      return this.db.version;
    }
  }, {
    key: 'stores',
    get: function get() {
      return [].slice.call(this.db.objectStoreNames);
    }
  }]);

  return Database;
}(_componentEmitter2.default);

exports.default = Database;
module.exports = exports['default'];

},{"./idb-store":12,"component-emitter":1,"idb-factory":3,"storage-emitter":8}],10:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.storeDescriptor = storeDescriptor;
exports.indexDescriptor = indexDescriptor;

/**
 * Link to array prototype method.
 */

var slice = [].slice;

/**
 * Cache stores descriptors using [db][version] notation.
 * Since database structure does not change between versions.
 */

var cache = {};

/**
 * Get store descriptor.
 *
 * @param {IDBDatabase} db
 * @param {String} storeName
 * @return {Object}
 */

function storeDescriptor(db, storeName) {
  if (!cache[db.name]) cache[db.name] = {};
  if (!cache[db.name][db.version]) cache[db.name][db.version] = {};
  if (!cache[db.name][db.version][storeName]) {
    (function () {
      var store = db.transaction(storeName, 'readonly').objectStore(storeName);
      var indexes = {};
      slice.call(store.indexNames).forEach(function (indexName) {
        var index = store.index(indexName);
        indexes[indexName] = {
          name: indexName,
          keyPath: getKeyPath(index.keyPath),
          unique: index.unique,
          multiEntry: index.multiEntry || false
        };
      });
      cache[db.name][db.version][storeName] = {
        name: storeName,
        keyPath: store.keyPath,
        autoIncrement: store.autoIncrement, // does not work in IE
        indexes: indexes
      };
    })();
  }
  // clone data to avoid external cache modification
  return clone(cache[db.name][db.version][storeName]);
}

/**
 * Get index descriptor.
 *
 * @param {IDBDatabase} db
 * @param {String} storeName
 * @param {String} indexName
 * @return {Object}
 */

function indexDescriptor(db, storeName, indexName) {
  return storeDescriptor(db, storeName).indexes[indexName];
}

/**
 * Naive clone implementaion.
 *
 * @param {Object} obj
 * @return {Object}
 */

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compound keys in IE.
 */

var compoundKeysPropertyName = '__$$compoundKey';
var keySeparator = '$_$';
var propertySeparatorRegExp = /\$\$/g;

function decodeCompoundKeyPath(keyPath) {
  // Remove the "__$$compoundKey." prefix
  keyPath = keyPath.substr(compoundKeysPropertyName.length + 1);

  // Split the properties into an array
  // "name$$first$_$name$$last" ==> ["name$$first", "name$$last"]
  keyPath = keyPath.split(keySeparator);

  // Decode dotted properties
  // ["name$$first", "name$$last"] ==> ["name.first", "name.last"]
  for (var i = 0; i < keyPath.length; i++) {
    keyPath[i] = keyPath[i].replace(propertySeparatorRegExp, '.');
  }
  return keyPath;
}

function getKeyPath(keyPath) {
  if (keyPath instanceof global.DOMStringList) {
    // Safari
    return [].slice.call(keyPath);
  } else if (keyPath.indexOf(compoundKeysPropertyName) !== -1) {
    // Shim
    return decodeCompoundKeyPath(keyPath);
  }
  return keyPath;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _idbRange = require('idb-range');

var _idbRange2 = _interopRequireDefault(_idbRange);

var _idbRequest = require('idb-request');

var _idbDescriptor = require('./idb-descriptor');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Show multiEntry warning only once.
 */

var showWarning = true;

var Index = function () {

  /**
   * Initialize new `Index`.
   *
   * @param {IDBDatabase} db
   * @param {String} storeName
   * @param {String} indexName
   */

  function Index(db, storeName, indexName) {
    _classCallCheck(this, Index);

    if (typeof storeName !== 'string') throw new TypeError('"storeName" is required');
    if (typeof indexName !== 'string') throw new TypeError('"indexName" is required');
    this.db = db;
    this.storeName = storeName;
    this.props = (0, _idbDescriptor.indexDescriptor)(db, storeName, indexName);

    if (this.multi && showWarning) {
      showWarning = false;
      console.warn('multiEntry index is not supported completely, because it does not work in IE. But it should work in remaining browsers.'); // eslint-disable-line
    }
  }

  /**
   * Property getters.
   */

  _createClass(Index, [{
    key: 'get',

    /**
     * Get a value by `key`.
     *
     * @param {Any} key
     * @return {Promise}
     */

    value: function get(key) {
      var index = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).index(this.name);
      return (0, _idbRequest.request)(index.get(key)).then(function (val) {
        return val !== null ? val : undefined;
      });
    }

    /**
     * Get all values in `range` and with `limit`.
     *
     * @param {Any} [range]
     * @param {Object} [limit]
     * @return {Promise}
     */

  }, {
    key: 'getAll',
    value: function getAll(range) {
      var limit = arguments.length <= 1 || arguments[1] === undefined ? Infinity : arguments[1];

      try {
        var store = this.db.transaction(this.name, 'readonly').objectStore(this.name);
        return (0, _idbRequest.request)(store.getAll((0, _idbRange2.default)(range), limit));
      } catch (err) {
        return (0, _idbRequest.mapCursor)(this.openCursor(range), function (cursor, result) {
          if (limit > result.length) result.push(cursor.value);
          cursor.continue();
        });
      }
    }

    /**
     * Count records in `range`.
     *
     * @param {Any} range
     * @return {Promise}
     */

  }, {
    key: 'count',
    value: function count(range) {
      try {
        var index = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).index(this.name);
        return (0, _idbRequest.request)(index.count((0, _idbRange2.default)(range)));
      } catch (_) {
        // fix https://github.com/axemclion/IndexedDBShim/issues/202
        return this.getAll(range).then(function (all) {
          return all.length;
        });
      }
    }

    /**
     * Low-level proxy method to open read cursor.
     *
     * @param {Any} range
     * @param {String} [direction]
     * @return {IDBRequest}
     */

  }, {
    key: 'openCursor',
    value: function openCursor(range) {
      var direction = arguments.length <= 1 || arguments[1] === undefined ? 'next' : arguments[1];

      var index = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).index(this.name);
      return index.openCursor((0, _idbRange2.default)(range), direction);
    }
  }, {
    key: 'name',
    get: function get() {
      return this.props.name;
    }
  }, {
    key: 'key',
    get: function get() {
      return this.props.keyPath;
    }
  }, {
    key: 'unique',
    get: function get() {
      return this.props.unique;
    }
  }]);

  return Index;
}();

exports.default = Index;
module.exports = exports['default'];

},{"./idb-descriptor":10,"idb-range":4,"idb-request":5}],12:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _idbRange = require('idb-range');

var _idbRange2 = _interopRequireDefault(_idbRange);

var _idbRequest = require('idb-request');

var _idbBatch = require('idb-batch');

var _idbBatch2 = _interopRequireDefault(_idbBatch);

var _idbDescriptor = require('./idb-descriptor');

var _idbIndex = require('./idb-index');

var _idbIndex2 = _interopRequireDefault(_idbIndex);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Store = function () {

  /**
   * Initialize new `Store`.
   *
   * @param {IDBDatabase} db
   * @param {String} storeName
   */

  function Store(db, storeName) {
    var _this = this;

    _classCallCheck(this, Store);

    if (typeof storeName !== 'string') throw new TypeError('"storeName" is required');
    this.db = db;
    this.props = (0, _idbDescriptor.storeDescriptor)(db, storeName);
    this.indexes.forEach(function (indexName) {
      if (typeof _this[indexName] !== 'undefined') return;
      Object.defineProperty(_this, indexName, {
        get: function get() {
          return this.index(indexName);
        }
      });
    });
  }

  /**
   * Property getters.
   */

  _createClass(Store, [{
    key: 'index',

    /**
     * Get index by `name`.
     *
     * @param {String} name
     * @return {Index}
     */

    value: function index(name) {
      if (this.indexes.indexOf(name) === -1) throw new TypeError('"' + name + '" index does not exist');
      return new _idbIndex2.default(this.db, this.name, name);
    }

    /**
     * Add `value` to `key`.
     *
     * @param {Any} [key] is optional when store.key exists.
     * @param {Any} val
     * @return {Promise}
     */

  }, {
    key: 'add',
    value: function add(key, val) {
      if (typeof val === 'undefined') {
        val = key;
        key = undefined;
      }
      return (0, _idbBatch2.default)(this.db, this.name, [{ key: key, val: val, type: 'add' }]).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 1);

        var res = _ref2[0];
        return res;
      });
    }

    /**
     * Put (create or replace) `val` to `key`.
     *
     * @param {Any} [key] is optional when store.key exists.
     * @param {Any} val
     * @return {Promise}
     */

  }, {
    key: 'put',
    value: function put(key, val) {
      if (typeof val === 'undefined') {
        val = key;
        key = undefined;
      }
      return (0, _idbBatch2.default)(this.db, this.name, [{ key: key, val: val, type: 'put' }]).then(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 1);

        var res = _ref4[0];
        return res;
      });
    }

    /**
     * Del value by `key`.
     *
     * @param {String} key
     * @return {Promise}
     */

  }, {
    key: 'del',
    value: function del(key) {
      return (0, _idbBatch2.default)(this.db, this.name, [{ key: key, type: 'del' }]).then(function (_ref5) {
        var _ref6 = _slicedToArray(_ref5, 1);

        var res = _ref6[0];
        return res;
      });
    }

    /**
     * Proxy to idb-batch.
     *
     * @param {Object|Array} ops
     * @return {Promise}
     */

  }, {
    key: 'batch',
    value: function batch(ops) {
      return (0, _idbBatch2.default)(this.db, this.name, ops);
    }

    /**
     * Clear.
     *
     * @return {Promise}
     */

  }, {
    key: 'clear',
    value: function clear() {
      var tr = this.db.transaction(this.name, 'readwrite');
      return (0, _idbRequest.request)(tr.objectStore(this.name).clear(), tr);
    }

    /**
     * Get a value by `key`.
     *
     * @param {Any} key
     * @return {Promise}
     */

  }, {
    key: 'get',
    value: function get(key) {
      var store = this.db.transaction(this.name, 'readonly').objectStore(this.name);
      return (0, _idbRequest.request)(store.get(key));
    }

    /**
     * Get all values in `range` and with `limit`.
     *
     * Using native implemention when available:
     * https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAll
     *
     * @param {Any} [range]
     * @param {Object} [limit]
     * @return {Promise}
     */

  }, {
    key: 'getAll',
    value: function getAll(range) {
      var limit = arguments.length <= 1 || arguments[1] === undefined ? Infinity : arguments[1];

      try {
        var store = this.db.transaction(this.name, 'readonly').objectStore(this.name);
        return (0, _idbRequest.request)(store.getAll((0, _idbRange2.default)(range), limit));
      } catch (err) {
        return (0, _idbRequest.mapCursor)(this.openCursor(range), function (cursor, result) {
          if (limit > result.length) result.push(cursor.value);
          cursor.continue();
        });
      }
    }

    /**
     * Count.
     *
     * @param {Any} [range]
     * @return {Promise}
     */

  }, {
    key: 'count',
    value: function count(range) {
      try {
        var store = this.db.transaction(this.name, 'readonly').objectStore(this.name);
        return (0, _idbRequest.request)(store.count(range));
      } catch (_) {
        // fix https://github.com/axemclion/IndexedDBShim/issues/202
        return this.getAll(range).then(function (all) {
          return all.length;
        });
      }
    }

    /**
     * Low-level proxy method to open read cursor.
     *
     * @param {Any} range
     * @param {String} [direction]
     * @return {IDBRequest}
     */

  }, {
    key: 'openCursor',
    value: function openCursor(range) {
      var direction = arguments.length <= 1 || arguments[1] === undefined ? 'next' : arguments[1];

      var store = this.db.transaction(this.name, 'readonly').objectStore(this.name);
      return store.openCursor((0, _idbRange2.default)(range), direction);
    }
  }, {
    key: 'name',
    get: function get() {
      return this.props.name;
    }
  }, {
    key: 'key',
    get: function get() {
      return this.props.keyPath;
    }
  }, {
    key: 'indexes',
    get: function get() {
      return Object.keys(this.props.indexes);
    }
  }]);

  return Store;
}();

exports.default = Store;
module.exports = exports['default'];

},{"./idb-descriptor":10,"./idb-index":11,"idb-batch":2,"idb-range":4,"idb-request":5}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Index = exports.Store = exports.Database = undefined;
exports.default = treo;

var _storageEmitter = require('storage-emitter');

var _storageEmitter2 = _interopRequireDefault(_storageEmitter);

var _idbFactory = require('idb-factory');

var _idbDatabase = require('./idb-database');

var _idbDatabase2 = _interopRequireDefault(_idbDatabase);

var _idbStore = require('./idb-store');

var _idbStore2 = _interopRequireDefault(_idbStore);

var _idbIndex = require('./idb-index');

var _idbIndex2 = _interopRequireDefault(_idbIndex);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function treo(name, version, upgradeCallback) {
  if (typeof name !== 'string') throw new TypeError('"name" is required');
  if (typeof version !== 'undefined') _storageEmitter2.default.emit('versionchange', { name: name, version: version });
  return (0, _idbFactory.open)(name, version, upgradeCallback).then(function (db) {
    return new _idbDatabase2.default(db);
  });
}

exports.Database = _idbDatabase2.default;
exports.Store = _idbStore2.default;
exports.Index = _idbIndex2.default;

},{"./idb-database":9,"./idb-index":11,"./idb-store":12,"idb-factory":3,"storage-emitter":8}]},{},[13])(13)
});