
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
  var params = name.split(':');
  if (params.length !== 2) return onerror('name has format "dbName:storeName"');

  var dbName    = params[0];
  var storeName = params[1];

  return function(key, val, cb) {
    switch (arguments.length) {
      case 3: return set(key, val, cb);
      case 2: return get(key, cb);
      case 1: return all(cb);
      case 0: return onerror('can not use without params');
    }
  };
}

function onerror(msg) {
  throw new TypeError('Indexed: ' + msg);
}
