var treo = require('treo');
var fn;

// getter to detect env
treo.supported;

/**
 * Define schema.
 */

var schema = treo.schema()
  .version(1)
    .addStore('users')
    .addStore('trees')
    .addStore('cards')
    .addIndex('byTree', 'treeId');

/**
 * Open db.
 */

var db = treo('gingko', schema);
db.drop();

// properties
db.name; // gingko
db.version; // 1
db.stores; // array of Store objects ['users', 'trees', 'cards']

/**
 * Create transaction.
 */

var users = db.store('users');
var trees = db.store('trees');

users.put('current', {
  _id: '431e04195867c339a00001b7',
  email: 'alekseys.kulikov@gmail.com'
}, fn); // accepts callback function(err) {}

/**
 * Use stores.
 */

var cards = db.store('cards');

cards.name; // 'cards'
cards.indexes; // list of indexes ['byTree']
cards.db; // link to db

cards.get('id', fn);
cards.get(['id1', 'id2', 'id3'], fn);
cards.get('id').then(fn);
cards.del('id', fn);
cards.del(['id1', 'id2', 'id3'], fn);
cards.count(fn);
cards.clear(fn);

// perform bacth operation
cards.put({
  '2720': { _id: '2720', content: 'Quarry Memories' },
  '0022': { _id: '0022', content: 'Water Buffaloes' },
  '8e15': null,
}, fn); // function(err) {}

// properties
cards.name; // 'cards'
cards.indexes; // list of indexes ['byTree']
cards.db; // link to db

// read data
users.get('current', fn);
trees.all(fn);

// filter by index, get for not unique index retuns array
cards.index('byTree').get('treeId', fn);

// main goals:
// - simple API to start write/read without waiting for connect,
//   detection of existing stores, creating transations
// - hide complexety of IndexedDB
// - powerful API for schema/version management
// - enjoyable way to do powerful tasks, like batch or filter by index.
// - stop support of indexed, and rename it to treo
//
// Later:
// - support promises
// - move properties for db
// - more methods to describe schema
// - transaction as object
// - chain actions in one transaction
// - to be as close as possible to native functionality and power,
//   provide native objects and events
// - streams
// - ranges
// - development mode
