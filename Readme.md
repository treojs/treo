# Treo  [![Build Status](https://travis-ci.org/ask11/treo.png?branch=master)](https://travis-ci.org/ask11/treo)

  Treo is a simple and convinient interface to [IndexedDB](http://www.w3.org/TR/IndexedDB/),
  created to make process of writing offline applications more enjoyable.

  It hides complexity of IndexedDB and leave the power: batch, indexes and async non-blocking behavior.
  All features, except multiple indexes and advanced ranges are backward
  compatibile with outdated browsers through [IndexedDBShim](https://github.com/axemclion/IndexedDBShim).

## Main features

  * Simple API to powerful IndexedDB features, like batch or indexes.
  * Command buffering, you can start read/write right away.
  * Small codebase without dependencies, ~400 LOC, 2.5Kb gziped.
  * Powerful DSL to manage database schema and versions.
  * Better error handling through callbacks.
  * Exposed access to low level IndexedDB methods, in order to cover edge cases.
  * Easy to extend and create plugins.

## Installation

```
$ bower install treo
$ component install ask11/treo
$ npm install treo --save
```

  Standalone build available as [treo.js](https://github.com/ask11/treo/blob/master/treo.js).

```html
<script src="treo.js"></script>
<script src="indexedb-shim.js"></script> <!-- for legacy browsers -->
<script>window.treo('my-db', schema);</script>
```

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

  For more examples check out `[/examples](https://github.com/ask11/treo/blob/master/examples)` folder.

# API

### treo(name, schema)
### treo.schema()

## Schema

### schema.version(version)
### schema.addStore(name, opts)
### schema.addIndex(name, field, opts)
### schema.getStore(name)

## DB

### db.store(name)
### db.close([fn])
  callback is optional when db.status == ‘open’

### db.drop(fn)
### properties
  * version
  * name
  * status

## Store

### store.get(key, fn)
### store.put(key, val, fn)
  store.put(obj, fn) if key exists

### store.del(key, fn)
### store.batch(opts, fn)
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

  Aleksey Kulikov, [MIT](http://ask11.mit-license.org/).
