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

See [performance.html](https://github.com/ask11/indexed/blob/master/performance.html) for more information.

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

### TODO

  - add API docs with description of migrations and callbacks
  - performance: use different stores + move suite to jsperf.

## License

  Aleksey Kulikov, MIT
