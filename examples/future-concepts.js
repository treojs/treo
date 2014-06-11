var cards, trees, fn, db;
// development mode (inspired by storage)

// store properties
cards.key; // '_id'
cards.increment; // false

// Populates db in one readwrite transaction, it batches requests automatically,
// so they run one after another and don't block UI.
cards
  .put({ content: 'Quarry Memories', _id: '2720cd8e150a7d6559000022' })
  .put({ content: 'Water Buffaloes', _id: '00222720cd8e150a7d655900' })
  .put({ content: 'Bedrock Nights', _id: '8e150a7d65590000222720cd' })
  .then(function() {
    // nothing returned it only means that data saved succesfully
  });

// for future I will ad key, value streams and ranges support.
// and improve powerful concept of indexes

trees.keys(fn); // get all keys
trees.keys({ gte: 'someId*', inverse: true }, fn); // search by primary key
cards.index('byTree').keys({ skipDuplicates: true, inverse: true }, fn); // inversed treeIds
cards.index('byTree').all({ gte: 'tree-1*', lte: 'tree-2*' }, fn);

// first id is optional, and can be configured by key option
// if it's missed, treo throws an error
// in future it will accept id generator as a schema function
trees.put({ _id: 'new-id', name: 'my tree' });

// streams are interface to cursors
// regular read stream emit key/value pair
var stream = cards.createReadStream();

stream.on('data', function(key, val) {
  console.log(key, val);
});

stream.on('error', function(err) {
  console.log('Unexpected error', err);
});

// done, cursor has no value
stream.on('end');

// also key or value streams available
db.createKeyStream(); // create stream only by keys

// nice ranges implementation
// https://github.com/juliangruber/node-le/blob/master/index.js
db.createValueStream({ gte: 234567 }); // create stream only by values

// go in inverse order
db.createValueStream({ inverse: true });

// also you can run streams by index
// in IndexedDB are just a special types of object stores
var authors = cards.index('byAuthor');
authors.createReadStream({ eq: 'Fred' }); // all queries arguments are avaliable

// if index is not unique, we can skip duplicated keys
authors.createKeyStream({ skipDuplicates: true });
