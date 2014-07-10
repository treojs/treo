# Treo  [![Build Status](https://travis-ci.org/ask11/treo.png?branch=master)](https://travis-ci.org/ask11/treo)

  Treo is high-level interface to [IndexedDB](w3.org/TR/IndexedDB/),
  with backward compatibility through [IndexedDBShim](https://github.com/axemclion/IndexedDBShim).
  The main goal is to make enjoyable to write modern web applications with offline experience.
  It hides complexity of IndexedDB and leave the power: batch, indexes and async non-blocking behavior.

## Example

  Let's take a look at official [w3c example](http://www.w3.org/TR/IndexedDB/#introduction)
  and rewrite it with treo:

```js
var treo = require('treo');

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
