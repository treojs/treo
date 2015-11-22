import parseRange from 'idb-range'
import { request, requestCursor } from 'idb-request'

export default class Index {

  /**
   * Initialize new `Index`.
   *
   * @param {Store} store
   * @param {Object} opts { name, field, unique, multi }
   */

  constructor(store, opts) {
    this.store = store
    this.name = opts.name
    this.field = opts.field
    this.multi = opts.multiEntry
    this.unique = opts.unique
  }

  /**
   * Get value by `key`.
   *
   * @param {Any} key
   * @return {Promise}
   */

  get(key) {
    return this.store.db.getInstance().then((db) => {
      const index = db.transaction(this.store.name, 'readonly').objectStore(this.store.name).index(this.name)
      return request(index.get(key))
    })
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
    return this.store.db.getInstance().then((db) => {
      const index = db.transaction(this.store.name, 'readonly').objectStore(this.store.name).index(this.name)
      return request(range ? index.count(parseRange(range)) : index.count())
    })
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
    return this.store.db.getInstance().then((db) => {
      const index = db.transaction(this.name, 'readonly').objectStore(this.store.name).index(this.name)
      const req = index.openCursor(parseRange(range), direction || 'next')
      return requestCursor(req, iterator)
    })
  }
}
