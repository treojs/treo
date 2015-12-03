import 'polyfill-function-prototype-bind'
import 'regenerator/runtime'
import ES6Promise from 'es6-promise'
import Schema from 'idb-schema'
import treoWebsql from 'treo-websql'

/**
 * Polyfill.
 */

ES6Promise.polyfill()
treoWebsql()

/**
 * Shared schema.
 */

export default new Schema()
.version(1)
  .addStore('books', { key: 'isbn' })
  .addIndex('byTitle', 'title', { unique: true })
  .addIndex('byAuthor', 'author')
.version(2)
  .getStore('books')
  .addIndex('byYear', 'year')
.version(3)
  .addStore('magazines', { key: 'id', increment: true })
  .addIndex('byName', 'name')
  .addIndex('byFrequency', 'frequency')
  .addIndex('byNameAndFrequency', ['name', 'frequency'], { unique: true })
  .addIndex('byKeywords', 'keywords', { multi: true })
.version(4)
  .addStore('storage1') // key-value
  .addStore('storage2')
