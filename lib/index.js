var request = require('idb-request');
var Schema = require('idb-schema');
var Database = require('./idb-database');
var Store = require('./idb-store');
var Index = require('./idb-index');

/**
 * Expose `Database`.
 */

exports = module.exports = Database;

/**
 * Expose core classes.
 */

exports.schema = Schema;
exports.Database = Database;
exports.Store = Store;
exports.Index = Index;

/**
 * Get/Set `Promise` property.
 */

Object.defineProperty(exports, 'Promise', {
  get: function() { return request.Promise },
  set: function(Promise) { request.Promise = Promise },
});

/**
 * Check IndexedDB availability.
 */

Object.defineProperty(exports, 'supported', {
  get: function() { return !!(global.indexedDB || global.webkitIndexedDB) }
});
