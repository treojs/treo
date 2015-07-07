# Treo

[![](https://img.shields.io/npm/v/treo.svg)](https://npmjs.org/package/treo)
[![](https://img.shields.io/travis/treojs/treo.svg)](https://travis-ci.org/treojs/treo)
[![](http://img.shields.io/npm/dm/treo.svg)](https://npmjs.org/package/treo)

Treo is a wrapper around [IndexedDB](http://www.w3.org/TR/IndexedDB/) to make browser storage more enjoyable to use.
Think about it as jQuery for IndexedDB. It does not add new abstractions, but simplifies the API and increases code reliability.

I spent a lot of time reading the official specification and understanding its nuances.
With treo I want to save this time for other developers, and help to focus on real problems and making the web better,
instead of fighting with the complex IndexedDB API and stumbling on simple tasks.

IndexedDB is powerful technology with support of indexes, stores, transactions and cursors.
It allows us to build any kind of client-side databases.
And let's be clear, it's the only real option to store data in browser, because localStorage is [synchronous](https://hacks.mozilla.org/2012/03/there-is-no-simple-solution-for-local-storage/) and WebSQL is deprecated.

## Main features

- Synchronous db.open. You can start read/write right away.
- Cover 100% of IndexedDB functionality
- Promise encapsulate behavior (no .origin, even for core objects)
* Expressive DSL to manage database schema migrations.
* Easy to extend and create plugins.
* Simple API for powerful features like batch or indexes.
* Small codebase without dependencies, ~370 LOC, 2.5Kb gziped.
* Plugins for promises support and websql polyfill.
* Better error handling through error first node-style callbacks.
* Handle `versionchage` event automatically, to safely close and reopen database connection
* Exposed access to low-level IndexedDB methods to cover edge cases.

## Example

Let's rewrite the official [w3c example](http://www.w3.org/TR/IndexedDB/#introduction) with treo:

```js
var treo = require('treo'); // or window.treo

// define db schema
var schema = treo.schema()
.version(1)
  .addStore('books', { key: 'isbn' })
  .addIndex('byTitle', 'title', { unique: true })
  .addIndex('byAuthor', 'author')
.version(2)
  .getStore('books')
  .addIndex('byYear', 'year')
.version(3)
  .addStore('magazines')
  .addIndex('byPublisher', 'publisher')
  .addIndex('byFrequency', 'frequency');

// open db synchronously
var db = treo('library', schema);
db.version; // 3
db.stores; // ['books', 'magazines']

// put some data in one transaction
var books = db.store('books');
books.batch([
  { isbn: 123456, title: 'Quarry Memories', author: 'Fred', year: 2012 },
  { isbn: 234567, title: 'Water Buffaloes', author: 'Fred', year: 2012 },
  { isbn: 345678, title: 'Bedrock Nights', author: 'Barney', year: 2013 },
]).then(function() {
  // Before this point, all actions were synchronous, and you don't need to wait
  // for db.open, initialize onupgradeneeded event, create readwrite transaction,
  // and handle all possible errors, and blocks.

  // get a single book by title using an index
  books.index('byTitle').get('Bedrock Nights').then(function(book) {});

  // get all books filtered by author
  books.index('byAuthor').getAll('Fred').then(function(all) {}); // all.length == 2
});

// If any error happen, you get it as an `err`.
// But it's better to handle each error separately using .catch
db.on('error', function(err) {});
```

Check out more [./examples](./examples):

* [use ES6 generators to improve async workflow](./examples/es6-generators.js)
* [simple key/value storage](./examples/key-value-storage.js)
* [plugin example](./examples/find-in-plugin.js)

## Installation

```
$ npm install treo --save
$ bower install treo
$ component install treojs/treo
```

Standalone build available as [dist/treo.js](./dist/treo.js).

```html
<script src="treo.js"></script>
<script>var db = window.treo('library');</script>
```

## Plugins

* [treo-websql](https://github.com/treojs/treo-websql) enables fallback to WebSQL in legacy browsers.
* [treo-callback](https://github.com/treojs/treo-callback) use callbacks instead of promises.

## Documentation

Short version of API is:

```js
var treo = require('treo') // alternative to window.indexedDB
treo.schema() // create idb-schema
treo.Database
treo.Transaction
treo.Store
treo.Index
treo.Promise = require('es6-promise') // change Promise library
treo.Schema // reference to using idb-schema
treo.request // reference to using idb-request
treo.range // reference to using idb-range

// Database represents connection to a database.
var db = treo('name', schema)
db.on('close', 'error', 'abort', 'versionchange')
db.transaction([name, name], mode) // create transaction
async db.close() // database might be in opening state
async db.del() // close && deleteDatabase (avoid onversionchange)
db.name
db.version
db.stores // array of stores
db.use(fn) // use plugin fn(db, treo)
db.store(name) // create store with automatic transactions

// Store is the primary mechanism for storing data.
var store = db.store('books')
async store.get(key) // returns undefined when record does not exists
async store.getAll([range]) // array
async store.put(key, val) // out-of-line keys
async store.put(obj) // in-line keys with keyPath
async store.del(key)
async store.batch(ops) // best way to reuse transaction
async store.count([range])
async store.clear()
async store.cursor({ [key], [direction], iterator }) // low level
store.index(name) // new Index()
store.name
store.key
store.indexes // array of indexes

// Index allows to looking up records in a store using properties of the values.
var index = store.index('byAuthor')
async index.get(key) // undefined if record does not exist
async index.getAll([range])
async index.count([range])
async index.cursor({ [key], [direction], iterator }) // low level
index.name
index.key
index.unique
index.multi

// Transaction represents atomic operation on data (uses internally).
var tr = db.transaction(['books', 'magazines'], 'write')
tr.on('error', 'abort', 'complete')
tr.store(name) // new Store() - use store in current transaction
tr.mode
async tr.abort() // database might be in opening state
async tr // thenable
```

## Notable issues

- Webkit does not support transactions to multiple stores https://bugs.webkit.org/show_bug.cgi?id=136937,
  it's an only issue you can experience with treo and Safari, in other cases, it just works.
  It's better than not support it at all.
- IndexedDBShim does not properly abort transactions

## License

[MIT](./LICENSE)
