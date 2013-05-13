```

  ,,                    ,,                                   ,,
  db                  `7db                                 `7db
                        db                                   db
`Idb  `7dbpMMMb.   ,M""bdb  .gP"Ya `7M'   `MF'.gP"Ya    ,M""bdb
  db    db    db ,AP    db ,M'   Yb  `VA ,V' ,M'   Yb ,AP    db
  db    db    db 8MI    db 8M""""""    XMX   8M"""""" 8MI    db
  db    db    db `Mb    db YM.    ,  ,V' VA. YM.    , `Mb    db
.JdbL..JdbL  JdbL.`Wbmd"dbL.`Mbmmd'.AM.   .MA.`Mbmmd'  `Wbmd"dbL.

```

IndexedDB is not fun. That is the reason why I created indexed: minimalistic high-level wrapper around IndexedDB inspired by [yields/store](https://github.com/yields/store). It tryes to simplify low-level IndexedDB API in one function. Callback follows node.js style, where `error` is a first argument. It works for simple cases, when you need to get all values from store or one by key. I think, it covers 90% use-cases.

## Installation

    $ component install ask11/indexed

## Example

```js
var Indexed = require('indexed');

// create function to manage object store `notes` from `notepad` db
var indexed = Indexed.create('notepad:notes', { key: '_id' });

// put - replace value by key
indexed(2, { name: 'note 2' }, function(err) {})
indexed(3, { name: 'note 3' }, function(err) {})

// get all
indexed(function(err, all) {}); // [{_id: 2, name: 'note 2'}, {_id: 3, name: 'note 3'}]

// get one object
indexed(3, function(err, one) {}); // {_id: 3, name: 'note 3'}
indexed(1, function(err, one) {}); // undefined

// delete object by key
indexed(2, null, function(err) {});

// clear object store
indexed(null, function(err) {});
```

### Links for learning IndexedDB

  - [Basic options and conceptions](https://developer.mozilla.org/en-US/docs/IndexedDB/Basic_Concepts_Behind_IndexedDB)
  - [Good examples with source](http://nparashuram.com/trialtool/index.html#example=/IndexedDB/trialtool/webkitIndexedDB.html&selected=#prereq&)
  - [IDBTransaction docs](https://developer.mozilla.org/en-US/docs/IndexedDB/IDBTransaction)
  - [Using IndexedDB](https://developer.mozilla.org/en-US/docs/IndexedDB/Using_IndexedDB) and [TODO list example](http://www.html5rocks.com/en/tutorials/indexeddb/todo/)
  - [db.js - IndexedDB query wrapper](https://github.com/aaronpowell/db.js)
  - [levelidb - levelup interface on top of IndexedDb](https://github.com/Raynos/levelidb)
  - [IDBWrapper - a cross-browser wrapper for IndexedDB](https://github.com/jensarps/IDBWrapper)

### TODO

  - test error cases: invalid key, delete with wrong key
  - make put smarter: be able to update, not replace
  - check that callback is a function
  - batch method
  - performance suite
  - add docs and api description
  - standalone release

### Development

  - `npm install` to install dependencies
  - `npm test` to ensure that all tests pass
  - `npm start` to run local mocha test server and watcher

## License

  Aleksey Kulikov, MIT
