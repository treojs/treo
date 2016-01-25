# Treo

> Consistent API to IndexedDB

[![](https://img.shields.io/npm/v/treo.svg)](https://npmjs.org/package/treo)
[![](https://img.shields.io/travis/treojs/treo.svg)](https://travis-ci.org/treojs/treo)
[![](http://img.shields.io/npm/dm/treo.svg)](https://npmjs.org/package/treo)

[![](https://saucelabs.com/browser-matrix/treo.svg)](https://saucelabs.com/u/treo)

The goal of treo is **to make IndexedDB mainstream by providing consistent API across all modern browsers**.


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
  key1: { title: 'Quarry Memories', author: 'Fred', year: 2012 },
  key2: { title: 'Water Buffaloes', author: 'Fred', year: 2012 },
  key3: { title: 'Bedrock Nights', author: 'Barney', year: 2013 },
})

// use indexes
const { byTitle, byAuthor } = db.books
const book = await byTitle.get('Bedrock Nights') // get a single book by title using an index
const all = await byAuthor.getAll('Fred') // get all books filtered by author

// add a try/catch block to handle errors, or use db.on("error") as global handler
// database connection may be closed when it is no longer needed
db.close()
```

## Documentation (short version)

**Explanation notes**:
- `await` means, that method returns `Promise`.
- `range` is any argument supported by [idb-range](https://github.com/treojs/idb-range#rangeopts).
- check [full documentation](https://github.com/treojs/treo#full-documentation) for more details.

```js
import treo, { Database, Store, Index } from 'treo' // standalone classes are also available

// Database represents connection to a database.
const db = await treo(dbName, version, upgradeCallback) // new Database(rawDb)
db.name
db.version
db.stores // array of stores
await db.del() // close && deleteDatabase
db.close() // close db and emit "close"
db.on('error', 'close', 'versionchange')

// Store is the primary mechanism for storing data.
const store = db.store(storeName) // new Store(db, storeName)
store.name
store.key
store.indexes // array of indexes
await store.get(key) // returns undefined when record does not exists
await store.getAll([range], [opts]) // array
await store.count([range])
await store.add([key], val)
await store.put([key], val)
await store.del(key)
await store.batch(operations) // best way to reuse transaction
await store.clear()
store.openCursor(range, [direction]) // low level proxy to native openCursor

// Index allows to looking up records in a store using properties of the values.
const index = store.index(indexName) // new Index(db, storeName, indexName)
index.name
index.key
index.unique
index.multi
await index.get(key) // undefined if record does not exist
await index.getAll([range], [opts])
await index.count([range])
index.openCursor(range, [direction]) // low level proxy to native openCursor
```


## Full documentation

Coming soon...

## License

[MIT](./LICENSE)
