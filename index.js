var Indexed  = require('./lib/indexeddb-adapter');
var fallback = require('./lib/localstorage-adapter');

module.exports = Indexed.supported ? Indexed : fallback;
