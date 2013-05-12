
/**
 * Module dependencies.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;

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
      case 2: return key === null ? store.clear(cb)    : store.get(key, cb);
      case 1: return store.all(cb);
      case 0: return onerror('callback required');
    }
  };
}

/**
 * Shortcut method to return Indexed error
 *
 * @api private
 */

function onerror(msg) {
  throw new TypeError('Indexed: ' + msg);
}

function getVersion(dbName, storeName) {
  return 1;
}

function getStores(dbName) {
  return [];
}

function Store(dbName, name, key) {
  this.dbName = dbName;
  this.name   = name;
  this.key    = key;
}

Store.prototype.all = function(cb) {
  this.getStore('readonly', function(err, store) {
    if (err) return cb(err);

    var req = store.openCursor();
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

Store.prototype.get = function(key, cb) {
  this.getStore('readonly', function(err, store) {
    if (err) return cb(err);

    var req = store.get(key);
    req.onerror = cb;
    req.onsuccess = function(event) {
      cb(null, req.result);
    };
  });
};

Store.prototype.put = function(key, val, cb) {
  var keyPath = this.key;
  this.getStore('readwrite', function(err, store) {
    if (err) return cb(err);

    val[keyPath] = key;
    var req = store.put(val);
    req.onerror = cb;
    req.onsuccess = function(event) { cb(); };
  });
};

Store.prototype.del = function(key, cb) {
  this.getStore('readwrite', function(err, store) {
    if (err) return cb(err);

    var req = store.delete(key);
    req.onerror = cb;
    req.onsuccess = function(event) { cb(); };
  });
};

Store.prototype.clear = function(cb) {
  cb('coming soon');
};

Store.prototype.getStore = function(mode, cb) {
  var name = this.name;
  this.getDb(function(err, db) {
    if (err) return cb(err);

    var transaction = db.transaction([name], mode);
    var objectStore = transaction.objectStore(name);
    cb(null, objectStore);
  });
};

Store.prototype.getDb = function(cb) {
  if (this.db) return cb(null, this.db);

  var that = this;
  var req  = indexedDB.open(this.name, getVersion(this.dbName, this.store));

  req.onerror = cb;
  req.onsuccess = function(event) {
    that.db = this.result;
    cb(null, that.db);
  };

  req.onupgradeneeded = function(event) {
    var db     = req.result;
    var stores = getStores(that.dbName);

    for (var i = 0; i < stores.length; i++) {
      db.createObjectStore(stores[i], { keyPath: that.key });
    }
  };
};
