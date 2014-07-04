var treo = require('treo');
var fn = console.log.bind(console); // use it as callback

// define schema with one storage with string key/values
var schema = treo.schema()
  .version(1)
  .addStore('storage');

// create db
var db = treo('key-value-storage', schema);

// save link to storage
var store = db.store('storage');

// put values
store.put('foo', 'value 1', fn);
store.put('bar', 'value 2', fn);
store.put('baz', 'value 3', fn);

// get value by key
store.get('bar', fn); // 'value 2'

// get all
store.all(fn); // all.length == 3

// batch more records
store.batch([
  { 'key4': 'value 4' },
  { 'key5': 'value 5' },
  { 'key6': 'value 6' },
], fn);

// count
store.count(fn); // 6

// close db
db.close();
