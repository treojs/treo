const request = require('idb-request')
const Schema = require('idb-schema')
const Database = require('./idb-database')
const Transaction = require('./idb-transaction')
const Store = require('./idb-store')
const Index = require('./idb-index')

/**
 * Expose `Database`.
 */

exports = module.exports = Database

/**
 * Expose core classes.
 */

exports.schema = Schema
exports.Database = Database
exports.Transaction = Transaction
exports.Store = Store
exports.Index = Index

/**
 * Get/Set `Promise` property.
 */

Object.defineProperty(exports, 'Promise', {
  get: () => { return request.Promise },
  set: (Promise) => { request.Promise = Promise },
})

/**
 * Check IndexedDB availability.
 */

Object.defineProperty(exports, 'supported', {
  get: () => { !!(global.indexedDB || global.webkitIndexedDB) }
})
