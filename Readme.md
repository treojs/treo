```

  ,,                    ,,                                   ,,
  db                  `7db                                 `7db
                        db                                   db
`Idb  `7dbpMMMb.   ,M""bdb  .gP"Ya `7M'   `MF'.gP"Ya    ,M""bdb
  db    db    db ,AP    db ,M'   Yb  `VA ,V' ,M'   Yb ,AP    db
  db    db    db 8MI    db 8M""""""    XMX   8M"""""" 8MI    db
  db    db    db `Mb    db YM.    ,  ,V' VA. YM.    , `Mb    db
.JdbL..JdbL  JdbL.`Wbmd"dbL.`Mbmmd'.AM.   .MA.`Mbmmd'  `Wbmd"dbL.

                                              IndexedDB with fun.
```

  Indexed is a minimalistic high-level wrapper around IndexedDB with downgrade to localStorage.

  [![browser support](https://ci.testling.com/ask11/indexed.png)](https://ci.testling.com/ask11/indexed)

## Key features

  * It works in all browsers since IE6, thanks [store.js](https://github.com/marcuswestin/store.js);
  * It smoothly manages db connections, errors, migrations, [versions](https://developer.mozilla.org/en-US/docs/IndexedDB/Basic_Concepts_Behind_IndexedDB#gloss_version), creating new stores with `onupgradeneeded`. It just works;
  * It has simple and nice API: `all`, `get`, `put`, `del`, and `clear`, which inspired by [LevelDB](https://code.google.com/p/leveldb/).

So... you just enjoy modern powerful async storage and don't worry about browser's environment and complicated IndexedDB API.

## Installation

  In the browser, include [dist/indexed.js](https://raw.github.com/ask11/indexed/master/dist/indexed.js) with a <script> tag. It does not have any dependencies.

  In bower:

    $ bower install indexed --save

  Originally, it builds with [component(1)](http://component.io/) and has obvious install command:

    $ component install ask11/indexed

## Example

```js
var Indexed = require('indexed');

// manage object store `notes` from `notepad` db
var notes = new Indexed('notepad:notes', { key: '_id' });

// put - replace value by key
notes.put(2, { name: 'note 2' }, function(err, note) {})
notes.put(3, { name: 'note 3' }, function(err, note) {})

// get all
notes.all(function(err, all) {});
// => [{_id: 2, name: 'note 2'}, {_id: 3, name: 'note 3'}]

// get one object
notes.get(3, function(err, one) {}); // {_id: 3, name: 'note 3'}
notes.get(1, function(err, one) {}); // undefined

// delete object by key
notes.del(2, function(err) {});

// clear object store
notes.clear(function(err) {});
```

## API

  All callbacks follow node.js style, where `err` is a first argument. In terms of IndexedDB, it helps to handle `onerror` event, which probably exists in all requests.

### new Indexed(name, [options])

  Create a new Indexed instance to work with selected [store](https://developer.mozilla.org/en-US/docs/IndexedDB/IDBObjectStore) and [db](https://developer.mozilla.org/en-US/docs/IndexedDB/IDBDatabase). **Name** follows simple convention `db-name:store-name`.
  **Options** helps you define [keyPath](https://developer.mozilla.org/en-US/docs/IndexedDB/Basic_Concepts_Behind_IndexedDB#gloss_keypath) value as a `key` option. If you will change key for existing store, it recreates storage and deletes existing data associted with store.

```js
var tags = new Indexed('notepad:tags', { key: 'updatedAt' });
```

### Indexed#put(key, val, cb)

  Put is the primary method for inserting data into the store, `key` will automatically mixed to the `val`. Put means insert or replace, so you can't update only one attribute.

```js
tags.put(Date.now(), { name: 'tag 1' }, function(err, tag) {
  // tag is { updatedAt: 1369373813125, name: 'tag 1' }
});
```

  In order to add a lot of data use [async](https://github.com/caolan/async) control-flow library.

```js
async.series([
  function(cb) { tags.put(Date.now(), { name: 'tag 2' }, cb); },
  function(cb) { tags.put(Date.now(), { name: 'tag 3' }, cb); },
  function(cb) { tags.put(Date.now(), { name: 'tag 4' }, cb); }
], function(err, tags) {});
```

### Indexed#all(cb)

  Returns all data from the object store.

```js
tags.all(function(err, values) {
  // Array[4]
})
```

### Indexed#get(key, cb)

  Returns value by `key` from the object store.

```js
tags.get(4, function(err, tag) {
  // { updatedAt: 1369373816410, name: 'tag 4' }
})
```

### Indexed#del(key, cb)

  Delete object by `key`.

```js
tags.del(3, function(err) {
  if (err) throw new Error('something bad happened');
})
```

### Indexed#clear(cb)

  Clear object store.

### Indexed.dropDb(name, cb)

  Drop existing database. Useful for testing and development.

## Learn IndexedDB

  - [MDN - IndexedDB](https://developer.mozilla.org/en-US/docs/IndexedDB/Basic_Concepts_Behind_IndexedDB) - Basic options and conceptions
  - Learn basics with [Using IndexedDB](https://developer.mozilla.org/en-US/docs/IndexedDB/Using_IndexedDB) and [TODO list example](http://www.html5rocks.com/en/tutorials/indexeddb/todo/)
  - [Db.js](https://github.com/aaronpowell/db.js) - IndexedDB query wrapper
  - [Levelidb](https://github.com/Raynos/levelidb) - levelup interface on top of IndexedDb
  - [IDBWrapper](https://github.com/jensarps/IDBWrapper) - a cross-browser wrapper for IndexedDB
  - [Bongo.js](https://github.com/aaronshaf/bongo.js) - rich query API + good list of links in [see also](https://github.com/aaronshaf/bongo.js#see-also) block.

## Development

  - `npm install` to install dependencies;
  - `npm test` to ensure that all tests pass;
  - `npm start` to run test server and watcher.

## License

  Aleksey Kulikov, [MIT](http://ask11.mit-license.org/).
