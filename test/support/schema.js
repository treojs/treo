var treo = require('../../lib')

/**
 * Shared schema.
 */

var schema = treo.schema()
.version(1)
  .addStore('books', { key: 'isbn' })
  .addIndex('byTitle', 'title', { unique: true })
  .addIndex('byAuthor', 'author')
.version(2)
  .getStore('books')
  .addIndex('byYear', 'year')
.version(3)
  .addStore('magazines', { key: 'id', increment: true })
  .addIndex('byName', 'name', { unique: true })
  .addIndex('byFrequency', 'frequency')
  .addIndex('byNameAndFrequency', ['name', 'frequency'], { unique: true })
  .addIndex('byKeywords', 'keywords', { multi: true })
.version(4)
  .addStore('storage') // key-value

/**
 * Expose `schema`.
 */

module.exports = schema
