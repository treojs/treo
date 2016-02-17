import parseRange from 'idb-range'
import { request, mapCursor } from 'idb-request'
import { indexDescriptor } from './idb-descriptor'

/**
 * Show multiEntry warning only once.
 */

let showWarning = true

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

    if (this.multi && showWarning) {
      showWarning = false
      console.warn('multiEntry index is not supported completely, because it does not work in IE. But it should work in remaining browsers.') // eslint-disable-line
    }
  }

  /**
   * Property getters.
   */

  get name() { return this.props.name }
  get key() { return this.props.keyPath }
  get unique() { return this.props.unique }

  /**
   * Get a value by `key`.
   *
   * @param {Any} key
   * @return {Promise}
   */

  get(key) {
    const index = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).index(this.name)
    return request(index.get(key)).then((val) => val !== null ? val : undefined)
  }

  /**
   * Get all values in `range` and with `limit`.
   *
   * @param {Any} [range]
   * @param {Object} [limit]
   * @return {Promise}
   */

  getAll(range, limit = Infinity) {
    try {
      const store = this.db.transaction(this.name, 'readonly').objectStore(this.name)
      return request(store.getAll(parseRange(range), limit))
    } catch (err) {
      return mapCursor(this.openCursor(range), (cursor, result) => {
        if (limit > result.length) result.push(cursor.value)
        cursor.continue()
      })
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
      return request(index.count(parseRange(range)))
    } catch (_) {
      // fix https://github.com/axemclion/IndexedDBShim/issues/202
      return this.getAll(range).then((all) => all.length)
    }
  }

  /**
   * Low-level proxy method to open read cursor.
   *
   * @param {Any} range
   * @param {String} [direction]
   * @return {IDBRequest}
   */

  openCursor(range, direction = 'next') {
    const index = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).index(this.name)
    return index.openCursor(parseRange(range), direction)
  }
}
