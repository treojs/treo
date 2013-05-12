```

  ,,                    ,,                                   ,,
  db                  `7MM                                 `7MM
                        MM                                   MM
`7MM  `7MMpMMMb.   ,M""bMM  .gP"Ya `7M'   `MF'.gP"Ya    ,M""bMM
  MM    MM    MM ,AP    MM ,M'   Yb  `VA ,V' ,M'   Yb ,AP    MM
  MM    MM    MM 8MI    MM 8M""""""    XMX   8M"""""" 8MI    MM
  MM    MM    MM `Mb    MM YM.    ,  ,V' VA. YM.    , `Mb    MM
.JMML..JMML  JMML.`Wbmd"MML.`Mbmmd'.AM.   .MA.`Mbmmd'  `Wbmd"MML.

                        `High-level wrapper around IndexedDB API`
```

## Installation

    $ component install ask11/indexed

## Example

```js
var Indexed = require('indexed');
var indexed = new Indexed('notepad:notes', { key: '_id' });

// get
indexed(function(err, all) {}); // get all with cursor
indexed(1, function(err, one) {});

// del
indexed(null, function(err) {});
indexed(1, null, function(err) {});

// put
indexed(2, { name: 'note 2' }, function(err) {})
indexed(3, { name: 'note 3' }, function(err) {})
```

### Links for learning IndexedDB

  - [Basic options and conceptions](https://developer.mozilla.org/en-US/docs/IndexedDB/Basic_Concepts_Behind_IndexedDB)
  - [Good examples with source](http://nparashuram.com/trialtool/index.html#example=/IndexedDB/trialtool/webkitIndexedDB.html&selected=#prereq&)
  - [IDBTransaction docs](https://developer.mozilla.org/en-US/docs/IndexedDB/IDBTransaction)
  - [Using IndexedDB](https://developer.mozilla.org/en-US/docs/IndexedDB/Using_IndexedDB) and [TODO list example](http://www.html5rocks.com/en/tutorials/indexeddb/todo/)
  - [db.js - IndexedDB query wrapper](https://github.com/aaronpowell/db.js)
  - [levelidb - levelup interface on top of IndexedDb](https://github.com/Raynos/levelidb)
  - [IDBWrapper - a cross-browser wrapper for IndexedDB](https://github.com/jensarps/IDBWrapper)

## TODO

  - use indexes, not only primary key
  - use ranges and cursors
  - share db connection and manage migrations smoothly
  - add docs and api description

## Development

  - `npm install` to install dependencies
  - `npm test` to ensure that all tests pass
  - `npm start` to run local test server and watcher

## License

  Aleksey Kulikov, MIT
