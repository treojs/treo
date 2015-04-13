# Treo

  [![](https://img.shields.io/npm/v/treo.svg)](https://npmjs.org/package/treo)
  [![](https://img.shields.io/travis/treojs/treo.svg)](https://travis-ci.org/treojs/treo)
  [![](http://img.shields.io/npm/dm/treo.svg)](https://npmjs.org/package/treo)

  Treo is a lightweight wrapper around [IndexedDB](http://www.w3.org/TR/IndexedDB/) to make browser storage more enjoyable to use.
  Think about it as jQuery for IndexedDB. It does not add new abstractions, but simplifies the API and increases code reliability.

  I spent a lot of time reading the official specification and understanding its nuances.
  With treo I want to save this time for other developers, and help to focus on real problems and making the web better,
  instead of fighting with the complex IndexedDB API and stumbling on simple tasks.

  IndexedDB is powerful technology with support of indexes, stores, transactions and cursors.
  It allows us to build any kind of client databases. And let's be clear, it's the only real option to store data in browser,
  because localStorage is [synchronous](https://hacks.mozilla.org/2012/03/there-is-no-simple-solution-for-local-storage/) and WebSQL is deprecated.

## Main features

  * Simple API for powerful features like batch or indexes.
  * Command buffering, you can start read/write right away.
  * Small codebase without dependencies, ~370 LOC, 2.5Kb gziped.
  * Powerful DSL to manage database schema and versions.
  * Plugins for promises support and websql polyfill.
  * Better error handling through error first node-style callbacks.
  * Handle `versionchage` event automatically, to safely close and reopen database connection
  * Exposed access to low-level IndexedDB methods to cover edge cases.
  * Easy to extend and create plugins.

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

// open db
var db = treo('library', schema);
db.version; // 3

// put some data in one transaction
var books = db.store('books');
books.batch([
  { isbn: 123456, title: 'Quarry Memories', author: 'Fred', year: 2012 },
  { isbn: 234567, title: 'Water Buffaloes', author: 'Fred', year: 2012 },
  { isbn: 345678, title: 'Bedrock Nights', author: 'Barney', year: 2013 },
], function(err) {
  // Before this point, all actions were synchronous, and you don't need to wait
  // for db.open, initialize onupgradeneeded event, create readwrite transaction,
  // and handle all possible errors, blocks, aborts.
  // If any error happen on one of this steps, you get it as `err`.
});

// get a single book by title using an index
books.index('byTitle').get('Bedrock Nights', function(err, book) {});

// get all books filtered by author
books.index('byAuthor').get('Fred', function(err, all) {}); // all.length == 2
```

  For more examples check out [/examples](/examples):

  * [simple key value storage](/examples/key-value-storage.js)
  * [use ES6 generators and promises for nice async workflow](/examples/es6-generators.js)
  * [plugin example](/examples/find-in-plugin.js)

## Installation

```
$ npm install treo --save
$ bower install treo
$ component install treojs/treo
```

  Standalone build available as [dist/treo.js](/dist/treo.js).

```html
<script src="treo.js"></script>
<script src="treo-websql.js"></script> <!-- [optional] for legacy browsers -->
<script src="treo-promise.js"></script> <!-- [optional] for es6-promises support -->
<script>
  var db = window.treo('my-db', schema)
    .use(treoWebsql())
    .use(treoPromise());
</script>
```

## Promises

  IndexedDB does not support ES6-Promises, but treo enables it with [treo-promise](https://github.com/treojs/treo/tree/master/plugins/treo-promise) plugin.

```js
var promise = require('treo/plugins/treo-promise'); // or window.treoPromise
var db = treo('library', schema)
  .use(promise());

var books = db.store('books');

Promise.all([
  books.get('123456'),
  books.get('234567'),
  books.get('345678'),
]).then(function(records) {
  console.log(records); // records.length == 3

  books.count().then(function(count) {
    console.log(count); // total count of records
  });
});
```

## Legacy browsers

  IndexedDB is available only [in modern browsers](http://caniuse.com/#search=indexeddb),
  but we still need to support Safari <= 7 and legacy mobile browsers.
  Treo ships with [treo-websql](https://github.com/treojs/treo/tree/master/plugins/treo-websql) plugin,
  which enables fallback to WebSQL and fix all issues of [buggy IndexedDBShim](https://github.com/axemclion/IndexedDBShim/issues).
  In fact all treo's tests pass even in [phantomjs environment](https://travis-ci.org/treojs/treo).

  Usage:

```js
var websql = require('treo/plugins/treo-websql'); // or window.treoWebsql
var db = treo('library', schema)
  .use(websql());
```

# API

  To initialize a new `db` instance, create a `schema` and pass it to main function.

```js
// define schema with one storage
var schema = treo.schema()
  .version(1)
  .addStore('storage');

// create db
var db = treo('key-value-storage', schema);
db.store('storage')
  .put('foo', 'value 1', fn); // connect, create db, put value
```

## Schema

  Treo uses `treo.schema()` to setup internal objects like stores and indexes for right away access.
  Also, based on schema, treo generates `onupgradeneeded` callback.

### schema.version(version)

  Change current version.

### schema.addStore(name, opts)

  Declare store with `name`.
  Available options:
  * `key` - setup keyPath for easy work with objects [default false]
  * `increment` - generate incremental key automatically [default false]

### schema.addIndex(name, field, opts)

  Declare index with `name` to one specific `field`.
  It can be called after store declaration or use `schema.getStore(name)` to change current store.
  Available options:
  * `unique` - index is unique [default false]
  * `multi` - declare multi index for array type field [dafault false]

### schema.getStore(name)

  Change current store.

### schema.dropStore(name)

  Delete store by `name`.

### schema.dropIndex(name)

  Delete index by `name` from current store.

## DB

  It's an interface to manage db connections, create transactions and get access
  to stores, where real work happen.

### db.use(fn)

  Use plugin `fn(db, treo)`, it calls with `db` instance and `treo` object,
  so you don't need to require treo as dependencies.

### db.store(name)

  Get store by `name`.
  See [Store API](https://github.com/treojs/treo#store) for more information.

### db.close([fn])

  Close db connection. Callback is optional when `db.status == 'open'`.

### db.drop(fn)

  Close connection and drop database.

### db.properties

  * version - db version
  * name - db name
  * status - connection status: close, opening, open
  * origin - original IDBDatabase instance

## Store

  Store is the primary storage mechanism for storing data.
  Think about it as table in SQL database.

### store.get(key, fn)

  Get value by `key`.

### store.put(key, val, fn) or store.put(obj, fn)

  Put `val` to `key`. Put means create or replace.
  If it's an object store with key property, you pass the whole object.
  `fn` callback returns error and key of new value.

```js
var schema = treo.schema()
  .version(1)
  .addStore('books', { key: 'isbn' });

var db = treo('key-value-storage', schema);
db.get('books').put({ isbn: 123456, title: 'Quarry Memories', author: 'Fred' }, fn);
// key is isbn field and equal 123456
```

### store.del(key, fn)

  Delete value by `key`.

### store.batch(opts, fn)

  Create/update/remove objects in one transaction.
  `opts` can be an object or an array (when key option is specified).

```js
var db = treo('key-value-storage', schema);
var storage = db.store('storage');

storage.put('key1', 'value 1', fn);
storage.put('key2', 'value 2', fn);

storage.batch({
  key1: 'update value',
  key2: null, // delete value
  key3: 'new value',
}, fn);
```

### store.count(fn)

  Count records in store.

### store.all(fn)

  Get all records.

### store.clear(fn)

  Clear store.

### store.index(name)

  Get index by `name`.

## Index

  Index is a way to filter your data.

### index.get(key, fn)

  Get values by `key`. When index is unique it returns only one value.
  `key` can be string, [range](https://github.com/treojs/idb-range), or IDBKeyRange object.

```js
books.index('byTitle').get('Bedrock Nights', fn); // get unique value
books.index('byAuthor').get('Fred', fn); // get array of matching values
books.index('byYear').get({ gte: 2012 });
books.index('byAuthor', IDBKeyRange.only('Barney'));
```

### index.count(key, fn)

  Count records by `key`, similar to get, but returns number.

## Low Level Methods

### db.getInstance(cb)

  Connect to db and create defined stores.
  It's useful, when you need to handle edge cases related with using origin database object.

### db.transaction(type, stores, fn)

  Create new transaction to list of stores.
  Available types: `readonly` and `readwrite`.

### store.cursor(opts, fn), index.cursor(opts, fn)

  Create custom cursors, see [example](https://github.com/treojs/treo/blob/master/examples/find-in-plugin.js) and [article](https://hacks.mozilla.org/2014/06/breaking-the-borders-of-indexeddb/) for more detailed usage.

### treo.Treo, treo.Store, treo.Index

  Treo exposes core objects for plugins extension.

### treo.cmp(a, b)

  Compare 2 values using indexeddb's internal key compassion algorithm.

## License

MIT
