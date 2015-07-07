var request = require('idb-request')
var parseRange = require('idb-range')
var Schema = require('idb-schema')
var Database = require('./idb-database')
var Transaction = require('./idb-transaction')
var Store = require('./idb-store')
var Index = require('./idb-index')

/**
 * Expose `Database`.
 */

exports = module.exports = Database

/**
 * Expose core classes.
 */

exports.schema = exports.Schema = Schema
exports.Database = Database
exports.Transaction = Transaction
exports.Store = Store
exports.Index = Index
exports.request = request
exports.range = parseRange

/**
 * Get/Set `Promise` property.
 */

Object.defineProperty(exports, 'Promise', {
  get: function() { return request.Promise },
  set: function(Promise) { request.Promise = Promise },
})
