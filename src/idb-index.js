import parseRange from 'idb-range'
import { request, requestCursor } from 'idb-request'
import { indexDescriptor } from './idb-descriptor'

export default class Index {

  /**
   * Initialize new `Index`.
   *
   * @param {IDBDatabase} db
   * @param {String} storeName
   * @param {String} indexName
   */

  constructor(db, storeName, indexName) {
    if (typeof storeName !== 'string') throw new TypeError('"storeName" is required')
    if (typeof indexName !== 'string') throw new TypeError('"indexName" is required')
    this.db = db
    this.storeName = storeName
    this.props = indexDescriptor(db, storeName, indexName)

    if (this.multi) {
      console.warn('multiEntry index is not supported completely, because it does not work in IE. But it should work in remaining browsers.') // eslint-disable-line
    }
  }

  /**
   * Property getters.
   */

  get name() { return this.props.name }
  get key() { return this.props.keyPath }
  get multi() { return this.props.multiEntry }
  get unique() { return this.props.unique }

  /**
   * Get value by `key`.
   *
   * @param {Any} key
   * @return {Promise}
   */

  get(key) {
    const index = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).index(this.name)
    return request(index.get(key))
  }

  /**
   * Get all values matching `range`.
   *
   * @param {Any} [range]
   * @return {Promise}
   */

  getAll(range) {
    const result = []
    return this.cursor({ range, iterator }).then(() => result)

    function iterator(cursor) {
      result.push(cursor.value)
      cursor.continue()
    }
  }

  /**
   * Count records in `range`.
   *
   * @param {Any} range
   * @return {Promise}
   */

  count(range) {
    try {
      const index = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).index(this.name)
      return request(range ? index.count(parseRange(range)) : index.count())
    } catch (_) {
      // fix https://github.com/axemclion/IndexedDBShim/issues/202
      return this.getAll(range).then((all) => all.length)
    }
  }

  /**
   * Create read cursor for specific `range`,
   * and pass IDBCursor to `iterator` function.
   *
   * @param {Object} opts { [range], [direction], iterator }
   * @return {Promise}
   */

  cursor({ iterator, range, direction }) {
    if (typeof iterator !== 'function') throw new TypeError('iterator is required')
    // fix: https://github.com/axemclion/IndexedDBShim/issues/204
    if (direction === 'prevunique' && !this.multi) {
      const method = iterator
      const keys = {} // count unique keys
      direction = 'prev'
      iterator = (cursor) => {
        if (!keys[cursor.key]) {
          keys[cursor.key] = true
          method(cursor)
        } else {
          cursor.continue()
        }
      }
    }

    const index = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).index(this.name)
    const req = index.openCursor(parseRange(range), direction || 'next')
    return requestCursor(req, iterator)
  }
}
