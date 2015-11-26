# Treo

[![](https://img.shields.io/npm/v/treo.svg)](https://npmjs.org/package/treo)
[![](https://img.shields.io/travis/treojs/treo.svg)](https://travis-ci.org/treojs/treo)
[![](http://img.shields.io/npm/dm/treo.svg)](https://npmjs.org/package/treo)

[![](https://saucelabs.com/browser-matrix/treo.svg)](https://saucelabs.com/u/treo)

Treo is a wrapper around [IndexedDB](http://www.w3.org/TR/IndexedDB/) to make browser storage more enjoyable to use.
Think about it as jQuery for IndexedDB. It does not add new abstractions, but simplifies the API, eliminates browsers inconsistency, and increases code reliability.

[IndexedDB](http://www.w3.org/TR/IndexedDB/) is powerful technology with support of indexes, stores, transactions and cursors. It allows us to build any kind of client-side databases.
And let's be clear, it's the only real option to store data in browser, because localStorage is [synchronous](https://hacks.mozilla.org/2012/03/there-is-no-simple-solution-for-local-storage/) and WebSQL is deprecated.

We spent a lot of time reading the official specification and understanding its nuances.
With treo, we want to save this time for other developers, and help to focus on real problems and making the web better, instead of fighting with the complex IndexedDB API and stumbling on simple tasks.

## Main features

* Synchronous db.open. You can start read/write right away.
* Cover 100% of IndexedDB functionality.
* ES6 Promises for asynchronous operations.
* Expressive DSL to manage database schema migrations.
* Small and [modular](https://github.com/treojs) codebase: ~346 LOC, 4.13 kB gzipped.
* Simple API for powerful features like batch or indexes.
* Easy to extend and create plugins.
* Access to low-level IndexedDB methods to cover edge cases.

## Installation

    npm install treo --save

Standalone build available as [dist/treo.js](./dist/treo.js).

```html
<script src="treo.js"></script>
<script>db = window.treo('library')</script>
```

## Example

Let's rewrite the official [w3c example](http://www.w3.org/TR/IndexedDB/#introduction) with treo:

```js
import treo from 'treo' // or window.treo

// define db schema
const schema = treo.schema()
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
  .addIndex('byFrequency', 'frequency')

// open db synchronously
const db = treo('library', schema)
db.version // 3

// put some data in one transaction
const books = db.store('books')
books.batch([
  { isbn: 123456, title: 'Quarry Memories', author: 'Fred', year: 2012 },
  { isbn: 234567, title: 'Water Buffaloes', author: 'Fred', year: 2012 },
  { isbn: 345678, title: 'Bedrock Nights', author: 'Barney', year: 2013 },
]).then(() => {
  // Before this point, all actions were synchronous, and you don't need to wait
  // for db.open, initialize onupgradeneeded event, create readwrite transaction,
  // and handle all possible errors, and blocks.

  // get a single book by title using an index
  books.byTitle.get('Bedrock Nights').then(function(book) {})

  // get all books filtered by author
  books.byAuthor.getAll('Fred').then(function(all) {}) // all.length == 2
})

// If any error happen, you get it as an `err`.
// But it's better to handle each error separately using .catch
db.on('error', function(err) {})
```

## Documentation

Short version of API is:

```js
const treo = require('treo') // alternative to window.indexedDB
treo.schema() // create idb-schema
treo.Database
treo.Store
treo.Index
treo.Schema // reference to using idb-schema

// Database represents connection to a database.
const db = treo('name', schema)
db.on('error', 'abort', 'versionchange')
async db.close() // database might be in opening state
async db.del() // close && deleteDatabase (avoid onversionchange)
db.name
db.version
db.stores // array of stores
db.store(name) // create store with automatic transactions

// Store is the primary mechanism for storing data.
const store = db.store('books')
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
const index = store.index('byAuthor')
async index.get(key) // undefined if record does not exist
async index.getAll([range])
async index.count([range])
async index.cursor({ [key], [direction], iterator }) // low level
index.name
index.key
index.unique
index.multi
```

## License

[MIT](./LICENSE)
