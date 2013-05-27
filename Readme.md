```

  ,,                    ,,                                   ,,
  db                  `7db                                 `7db
                        db                                   db
`Idb  `7dbpMMMb.   ,M""bdb  .gP"Ya `7M'   `MF'.gP"Ya    ,M""bdb
  db    db    db ,AP    db ,M'   Yb  `VA ,V' ,M'   Yb ,AP    db
  db    db    db 8MI    db 8M""""""    XMX   8M"""""" 8MI    db
  db    db    db `Mb    db YM.    ,  ,V' VA. YM.    , `Mb    db
.JdbL..JdbL  JdbL.`Wbmd"dbL.`Mbmmd'.AM.   .MA.`Mbmmd'  `Wbmd"dbL.

                                    Because IndexedDB is not fun.
```

Indexed is a minimalistic high-level wrapper around IndexedDB inspired by [LevelDB](https://code.google.com/p/leveldb/).
It tryes to simplify low-level IndexedDB API in 5 nice function: `all`, `get`, `put`, `del`, `clear`. It manages all db migrations and complexity, so... you just enjoy powerful async storage in the browser.

## Installation

    $ component install ask11/indexed

Standalone version is available as well. Add [dist/indexed.js](https://github.com/ask11/indexed/blob/master/dist/indexed.js) to your scripts and use `window.Indexed`.

## Example

```js
var Indexed = require('indexed');

// manage object store `notes` from `notepad` db
var indexed = new Indexed('notepad:notes', { key: '_id' });

// put - replace value by key
indexed.put(2, { name: 'note 2' }, function(err, note) {})
indexed.put(3, { name: 'note 3' }, function(err, note) {})

// get all
indexed.all(function(err, all) {}); // [{_id: 2, name: 'note 2'}, {_id: 3, name: 'note 3'}]

// get one object
indexed.get(3, function(err, one) {}); // {_id: 3, name: 'note 3'}
indexed.get(1, function(err, one) {}); // undefined

// delete object by key
indexed.del(2, function(err) {});

// clear object store
indexed.clear(function(err) {});
```

## API

All callbacks follow node.js style, where `err` is a first argument. In terms of IndexedDB, it helps to handle `onerror` event that probably exists in all requests. The power feature of Indexed, that takes up 50% of source code, is a smooth migrations and DB connections. You don't need to worry about db connections, db [versions](https://developer.mozilla.org/en-US/docs/IndexedDB/Basic_Concepts_Behind_IndexedDB#gloss_version), adding new stores with `onupgradeneeded`. It just works in background.

Indexed is strict about parameters to prevent silly typos. You always need to provide callback and use required amount of arguments for different methods.

### Indexed(name, options)

Create a new Indexed instance to work with selected [store](https://developer.mozilla.org/en-US/docs/IndexedDB/IDBObjectStore) and [db](https://developer.mozilla.org/en-US/docs/IndexedDB/IDBDatabase). `name` follows simple convention `db-name:store-name`.
`options` parameter is optional and helps you define [keyPath](https://developer.mozilla.org/en-US/docs/IndexedDB/Basic_Concepts_Behind_IndexedDB#gloss_keypath) value as a `key` option. If you change key for existing store, it will recreated without data.

```js
var tags = new Indexed('notepad:tags', { key: 'updatedAt' });
```

### Indexed.supported

Flag to control that IndexedDB is available. If it is false, you can use [ask11/weak-indexed](https://github.com/ask11/weak-indexed) with indentical async API, that downgrades to localStorage and supports all brosers since IE6. Also check caniuse [page](http://caniuse.com/#search=indexeddb).

Indexed tryes to build on top of latest standarts, so it works on Chrome 25+, IE10+, FF13+. The reasons for this requirements are *2-parameter open* and *string values for transaction modes*. Check [MDN Browser compatibility](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase#Browser_Compatibility) for irrefragable answer.

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

## Performance

- Google Chrome 26, OS X
```
Put = count: 1596; time: 2900ms; mean: 1.82ms;
Get = count: 1500; time: 1151ms; mean: 0.77ms;
Del = count: 1596; time: 2412ms; mean: 1.51ms;
```

- Firefox 20, OS X
```
Put = count: 1596; time: 9285ms; mean: 5.82ms;
Get = count: 1500; time: 1185ms; mean: 0.79ms;
Del = count: 1596; time: 9709ms; mean: 6.08ms;
```

- IE 10, Windows 7 (Virtualbox)
```
Put = count: 1596; time: 2532ms; mean: 1.59ms;
Get = count: 1500; time: 1939ms; mean: 1.29ms;
Del = count: 1596; time: 2142ms; mean: 1.34ms;
```

See [performance.html](https://github.com/ask11/indexed/blob/master/performance.html) for more information. In general it is IndexedDB performance on different platforms.

### Links for learning IndexedDB

  - [MDN - IndexedDB](https://developer.mozilla.org/en-US/docs/IndexedDB/Basic_Concepts_Behind_IndexedDB) - Basic options and conceptions
  - Learn basics with [Using IndexedDB](https://developer.mozilla.org/en-US/docs/IndexedDB/Using_IndexedDB) and [TODO list example](http://www.html5rocks.com/en/tutorials/indexeddb/todo/)
  - [db.js](https://github.com/aaronpowell/db.js) - IndexedDB query wrapper
  - [levelidb](https://github.com/Raynos/levelidb) - levelup interface on top of IndexedDb
  - [IDBWrapper](https://github.com/jensarps/IDBWrapper) - a cross-browser wrapper for IndexedDB
  - [bongo.js](https://github.com/aaronshaf/bongo.js) - rich query API + good list of links at [see also](https://github.com/aaronshaf/bongo.js#see-also) block.
  - [Trialtool](http://nparashuram.com/trialtool/index.html#example=/IndexedDB/trialtool/webkitIndexedDB.html&selected=#prereq&) - good examples

### Development

  - `npm install` to install dependencies
  - `npm test` to ensure that all tests pass
  - `npm start` to run mocha's test server and watcher

## License

  Aleksey Kulikov, MIT
