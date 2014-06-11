var treo = require('treo');
var fn;

/**
 * Define schema.
 */

var schema = treo.schema()
  .version(1)
    .createStore('users')
    .createStore('trees')
    .createStore('cards')
    .createIndex('byTree', 'treeId');

/**
 * Open db.
 */

var db = treo('gingko', schema); // optional callback fuction(err, db) {}

// return promise
db.then(fn);

// listen to events
db.on('error', fn); // function(err) {}
db.on('success', fn); // function(db) {}
db.on('blocked', fn);

// Pass standart IndexedDB event
// you can use it, if you'd like to improve schema DSL.
db.on('upgradeneeded', function(e) {
  e.oldVersion; // prev version
  e.newVersion; // new version
});

// close connection, after you finished to use db
db.close();

// properties
db.name; // gingko
db.version; // 1
db.stores; // array of Store objects ['users', 'trees', 'cards']
db.origin; // origin IDBDatabase instance
db.request; // origin IDBRequest used for open of db
db.error; // getter to db.request.error

/**
 * Drop db.
 */

db.drop();
treo.drop('gingko'); // or

/**
 * Create transaction.
 */

var users = db.store('users');
var trees = db.store('trees');

var tr = users.set('current', {
  _id: '431e04195867c339a00001b7',
  email: 'alekseys.kulikov@gmail.com'
}, fn); // accepts callback function(err) {}

// return promise
tr.then(fn);

// also event listener
tr.on('complete', fn);
tr.on('abort', fn);
tr.on('error', fn);

// properties
tr.db; // link to db
tr.mode; // readwrite|readonly
tr.store; // link to users store
tr.origin; // original IndexedDB transaction
tr.request; // current request
tr.active; // true|false
tr.error; // if any error happen

/**
 * Use stores.
 */

var cards = db.store('cards');

cards.get('id', fn);
cards.get(['id1', 'id2', 'id3'], fn);
cards.get('id').then(fn);
cards.del('id', fn);
cards.del(['id1', 'id2', 'id3'], fn);
cards.count(fn);
cards.clear(fn);

// perform bacth operation
cards.set({
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
// - powerful API to do schema/version management
// - to be as close as possible to native functionality and power,
//   provide native objects and events
// - enjoyable way to do powerful tasks, like batch or filter by index.
// - support promises and callbacks
