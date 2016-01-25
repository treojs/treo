# Treo

[![](https://img.shields.io/npm/v/treo.svg)](https://npmjs.org/package/treo)
[![](https://img.shields.io/travis/treojs/treo.svg)](https://travis-ci.org/treojs/treo)
[![](http://img.shields.io/npm/dm/treo.svg)](https://npmjs.org/package/treo)

[![](https://saucelabs.com/browser-matrix/treo.svg)](https://saucelabs.com/u/treo)

**Note: [0.5.x docs](https://github.com/treojs/treo/tree/0.5.1)**

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

Standalone build available as [dist/treo.min.js](./dist/treo.min.js).

```html
<script src="treo.min.js"></script>
<script>db = window.treo('library')</script>
```

## Example

Let's rewrite the official [w3c example](http://www.w3.org/TR/IndexedDB/#introduction)
with treo, [idb-schema](https://github.com/treojs/idb-schema), ES2015, and [ES2016 async/await syntax](https://jakearchibald.com/2014/es7-async-functions/):

```js
import treo from 'treo'
import Schema from 'idb-schema'

// define db schema
const schema = new Schema()
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

// open database using schema
const db = await treo('library', schema.version(), schema.callback())
db.version // 3

// put some data in one transaction
await db.books.batch({
  123456: { title: 'Quarry Memories', author: 'Fred', year: 2012 },
  234567: { title: 'Water Buffaloes', author: 'Fred', year: 2012 },
  345678: { title: 'Bedrock Nights', author: 'Barney', year: 2013 },
})

// get a single book by title using an index
const book = await db.books.byTitle.get('Bedrock Nights')

// get all books filtered by author
const all = await db.books.byAuthor.getAll('Fred')
```

## Documentation (short version)

```js
import treo, { Database, Store, Index } from 'treo' // standalone classes are also available

// Database represents connection to a database.
const db = await treo('name', version, upgradeCallback) // new Database(rawDb)
await db.del() // close && deleteDatabase
db.close() // close db and emit "close"
db.on('error', 'close', 'versionchange')
db.name
db.version
db.stores // array of stores

// Store is the primary mechanism for storing data.
const store = db.store(storeName) // new Store(db, storeName)
await store.get(key) // returns undefined when record does not exists
await store.getAll([range], [opts]) // array
await store.count([range])
await store.add([key], val)
await store.put([key], val)
await store.del(key)
await store.batch(ops) // best way to reuse transaction
await store.clear()
store.openCursor(range, [direction]) // low level proxy to native openCursor
store.name
store.key
store.indexes // array of indexes

// Index allows to looking up records in a store using properties of the values.
const index = store.index(indexName) // new Index(db, storeName, indexName)
await index.get(key) // undefined if record does not exist
await index.getAll([range], [opts])
await index.count([range])
index.openCursor(range, [direction]) // low level proxy to native openCursor
index.name
index.key
index.unique
index.multi
```

## License

[MIT](./LICENSE)
