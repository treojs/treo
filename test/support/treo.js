require('./treo-ie')
var treo = require('../../lib')
var websql = require('treo-websql')

treo.Promise = Promise // set Promise library
websql(treo) // patch to support WebSQL env

/**
 * Expose treo.
 */

module.exports = treo
