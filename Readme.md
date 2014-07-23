# Treo  [![Build Status](https://travis-ci.org/alekseykulikov/treo.png?branch=master)](https://travis-ci.org/alekseykulikov/treo)

  Treo is a lightweight wrapper around [IndexedDB](http://www.w3.org/TR/IndexedDB/) to make browser storage more enjoyable to use.
  Think about it as jQuery for IndexedDB. It does not add new abstractions, but simplified API and increases code reliability.

  I think, that as web developers community we have to stop fighting with complex IndexedDB API, stumble on simple tasks, and
  wait for LevelDB in the browser. Current specification is [stable](http://www.w3.org/TR/IndexedDB/), [available in modern browsers](http://caniuse.com/#search=indexeddb) and coming [2.0 spec](http://lists.w3.org/Archives/Public/public-webapps/2014AprJun/0149.html) will not have braking changes.
  IndexedDB is powerful technology with support of indexes, stores, transactions and cursors.
  Which allows to build any kind of client databases. And let's be clear, it's only one real option to store data in browser,
  because localStorage is [synchronous](https://hacks.mozilla.org/2012/03/there-is-no-simple-solution-for-local-storage/) and WebSQL is deprecated.
  I spent a lot of time reading official specification and understanding nuances. With treo I want to save this time for another developers. Help them to focus on real problems, and build awesome libraries, making the web better.

## Main features

  * Simple API around powerful IndexedDB features, like batch or indexes.
  * Command buffering, you can start read/write right away.
  * Small codebase without dependencies, ~400 LOC, 2.5Kb gziped.
  * Powerful DSL to manage database schema and versions.
  * Better error handling through error first node-style callbacks.
  * Exposed access to low level IndexedDB methods, in order to cover edge cases.
  * Easy to extend and create plugins.

## Example

  Let's rewrite official [w3c example](http://www.w3.org/TR/IndexedDB/#introduction) with treo:

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

// put some data in one transation
var books = db.store('books');
books.batch([
  { isbn: 123456, title: 'Quarry Memories', author: 'Fred' },
  { isbn: 234567, title: 'Water Buffaloes', author: 'Fred' },
  { isbn: 345678, title: 'Bedrock Nights', author: 'Barney' },
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

  For more examples check out `[/examples](https://github.com/alekseykulikov/treo/blob/master/examples)` folder.

## Installation

```
$ bower install treo
$ component install alekseykulikov/treo
$ npm install treo --save
```

  Standalone build available as [treo.js](https://github.com/alekseykulikov/treo/blob/master/treo.js).

```html
<script src="treo.js"></script>
<script src="indexedb-shim.js"></script> <!-- for legacy browsers -->
<script>window.treo('my-db', schema);</script>
```

# API

  To initialize new `db` instance create `schema` and pass it to main function.
  All methods, except multiple indexes and advanced ranges are backward
  compatible with outdated browsers through [IndexedDBShim](https://github.com/axemclion/IndexedDBShim).

```js
// define schema with one storage
var schema = treo.schema()
  .version(1)
  .addStore('storage');

// create db
var db = treo('key-value-storage', schema);
db.store('storage').put('foo', 'value 1', fn); // connect, create db, put value
```

## Schema

  Treo uses `treo.schema()` to setup internal objects like stores and indexes for right away access.
  Also, based on schema, treo generates `onupgradeneeded` callback.

### schema.version(version)

  Change current version.

### schema.addStore(name, opts)

  Declare store with `name`.
  Availble options:
  * `key` - setup keyPath for easy work with objects [default false].

### schema.addIndex(name, field, opts)

  Declare index with `name` to one specific `field`.
  It can be called after store declaration or use `schema.getStore(name)` to change current store.
  Available options:
  * unique - index is unique [default false]
  * multi - declare multi index for array type field [dafault false]

### schema.getStore(name)

  Change current store.

## DB

  It's an interface to manage db connections, create transactions and get access
  to stores, where real work happen.

### db.store(name)

  Get store by `name`.
  See [Store API](https://github.com/alekseykulikov/treo#store) for more information.

### db.close([fn])

  Close db connection. Callback is optional when `db.status == 'open'`.

### db.drop(fn)

  Close connection and drop database.

### db.properties

  * version - db version
  * name - db name
  * status - connection status: close, opening, open

## Store

  Store is the primary storage mechanism for storing data.
  Think about it as table in SQL database.

### store.get(key, fn)

  Get value by `key`.

### store.put(key, val, fn) or store.put(obj, fn)

  Put `val` to `key`. Put means create or replace.
  If it's an object store with key property, you pass the whole object.

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

  // current position
  opts is an object or an array

### store.count(fn)
### store.all(fn)
### store.clear(fn)
### store.index(name)
  get index by name

## Index

### index.get(key, fn) key is a string or range
### index.count(key, fn)

## Ranges
gt, gte, lt, lte or any IDBKeyRange instance
language to IDBKeyRange methods .only can be avoided, because IndexedDB does it by default

## Promises
  with then/promise

## keyPath

## Low level methods

### db.getInstance(fn)
### db.transaction(type, stores, fn)
### store.cursor(opts, fn) for custom cursors, see example and article
### index.cursor(opts, fn)
### treo.range({})
### treo.cmp(a, b)
### .Treo, .Schema, .Store, .Index
  core objects

## License

  Aleksey Kulikov, [MIT](http://alekseykulikov.mit-license.org/).
