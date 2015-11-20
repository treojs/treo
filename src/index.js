import Schema from 'idb-schema'
import parseRange from 'idb-range'
import Database from './idb-database'
import Transaction from './idb-transaction'
import Store from './idb-store'
import Index from './idb-index'

/**
 * Expose API.
 */

exports = module.exports = (name, schema) => new Database(name, schema)
exports.schema = () => new Schema()
exports.range = parseRange

/**
 * Expose core classes.
 */

exports.Schema = Schema
exports.Database = Database
exports.Transaction = Transaction
exports.Store = Store
exports.Index = Index
