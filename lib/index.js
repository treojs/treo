var type = require('type');
var request = require('idb-request');
var Schema = require('./schema');
var Store = require('./store');

/**
 * Link to `indexedDB`.
 */

var indexedDB = window.indexedDB
  || window.mozIndexedDB
  || window.webkitIndexedDB;

/**
 * Expose `Treo`.
 */

module.exports = Treo;

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
  this.stores = schema.getStores();
  this.status = 'close';
}

/**
 * Expose internal classes.
 */

Treo.schema = Schema;
Treo.Schema = Schema;
Treo.Store = Store;

/**
 * Drop.
 *
 * @param {Function} cb
 */

Treo.prototype.drop = function(cb) {
  if (this.status == 'close') {
    var req = indexedDB.deleteDatabase(this.name);
    request(req, function(err) { err ? cb(err) : cb() });
  }
};
