var Indexed  = require('./lib/indexeddb');
module.exports = Indexed.supported ? Indexed : require('./lib/localstorage');
