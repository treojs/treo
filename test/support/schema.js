var treo = require('../../lib');

/**
 * Shared schema.
 */

module.exports = treo.schema()
.version(1)
  .addStore('books', { key: 'isbn' })
  .addIndex('byTitle', 'title', { unique: true })
  .addIndex('byAuthor', 'author')
  .addIndex('byTitleAndAuthor', ['title', 'author'], { unique: true })
  .addStore('locals')
.version(2)
  .getStore('books')
  .addIndex('byYear', 'year')
.version(3)
  .addStore('magazines', { key: 'id', increment: true })
  .addIndex('byPublisher', 'publisher')
  .addIndex('byFrequency', 'frequency')
  .addIndex('byWords', 'words', { multi: true })
.version(4)
  .addStore('storage'); // key-value
