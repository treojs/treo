// ES6-generators is a powerful way to approach async workflow
// This example uses [co](https://github.com/visionmedia/co)
// to provide great readability.
// It's a near future, because Chrome enabled ES6-Generators by default and
// ES7 async/await is basically the same approach.
// It can be compiled with https://github.com/facebook/regenerator
// for older browsers.

var co = require('co');
var treo = require('treo');

// define schema

var schema = treo.schema()
.version(1)
  .addStore('books')
  .addIndex('byTitle', 'title', { unique: true })
  .addIndex('byAuthor', 'author')
  .addStore('locals')
.version(2)
  .getStore('books')
  .addIndex('byYear', 'year')
.version(3)
  .addStore('magazines', { key: 'id' })
  .addIndex('byPublisher', 'publisher')
  .addIndex('byFrequency', 'frequency')
  .addIndex('byWords', 'words', { multi: true });

// create db with promises support

var db = treo('library', schema);

// wrap async operations with generator.

co(function* () {
  var books = db.store('books');
  var magazines = db.store('magazines');

  // load initial data

  yield books.batch({
    1: { title: 'Quarry Memories', author: 'Fred', isbn: 1, year: 2012 },
    2: { title: 'Water Buffaloes', author: 'Fred', isbn: 2, year: 2013 },
    3: { title: 'Bedrock Nights', author: 'Barney', isbn: 3, year: 2012 },
  });

  yield magazines.batch([
    { id: 'id1', title: 'Quarry Memories', publisher: 'Bob' },
    { id: 'id2', title: 'Water Buffaloes', publisher: 'Bob' },
    { id: 'id3', title: 'Bedrocky Nights', publisher: 'Tim' },
    { id: 'id4', title: 'Waving Wings', publisher: 'Ken' },
  ]);

  // run queries

  console.log('Find book by unique index:', yield books.index('byTitle').get('Bedrock Nights'));
  console.log('Filter books:', yield books.index('byAuthor').getAll('Fred'));
  console.log('Count magazines:', yield magazines.count());
}).call();
