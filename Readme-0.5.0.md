To initialize a new `db` instance, create a `schema` and pass it to main function.

```js
// define schema with one storage
var schema = treo.schema().addStore('storage');

// create db
var db = treo('key-value-storage', schema);
db.store('storage').put('foo', 'value 1'); // connect, create db, put value
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

### db.transaction(stores, mode, fn)

Create new transaction to list of stores.
Available modes: `read` or `write` (`readonly` or `readwrite` also support).

### store.cursor(opts, fn), index.cursor(opts, fn)

Create custom cursors, see [example](https://github.com/treojs/treo/blob/master/examples/find-in-plugin.js) and [article](https://hacks.mozilla.org/2014/06/breaking-the-borders-of-indexeddb/) for more detailed usage.

### treo.Database, treo.Store, treo.Index

Treo exposes core objects for plugins extension.

## Notable issues

- Webkit does not support transactions to multiple stores https://bugs.webkit.org/show_bug.cgi?id=136937,
  it's an only issue you can experience with treo and Safari, in other cases, it just works.
  It's better than not support it at all.
- transaction abort often crushes Safari
- IndexedDBShim - transactions run synchronously, abort does not work https://github.com/axemclion/IndexedDBShim/blob/master/src/IDBTransaction.js
- https://bugs.webkit.org/show_bug.cgi?id=136888
- versionchage has not fired https://bugs.webkit.org/show_bug.cgi?id=136155
- multiEntry does not supported by IE10
