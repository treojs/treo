import parseRange from 'idb-range'
import request from 'idb-request'

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
   * Support range as an argument:
   * https://github.com/axemclion/IndexedDBShim/issues/202
   *
   * @param {Any} range
   * @return {Promise}
   */

  count(range) {
    return this.getAll(range).then((all) => all.length)
  }

  /**
   * Create read cursor for specific `range`,
   * and pass IDBCursor to `iterator` function.
   *
   * Support direction=prevunique for non-multi indexes
   * https://github.com/axemclion/IndexedDBShim/issues/204
   *
   * @param {Object} opts { [range], [direction], iterator }
   * @return {Promise}
   */

  cursor({ iterator, range, direction }) {
    if (typeof iterator !== 'function') throw new TypeError('iterator is required')
    return this.store.db.getInstance().then((db) => {
      const index = db.transaction(this.store.name, 'readonly').objectStore(this.store.name).index(this.name)
      if (direction === 'prevunique' && !this.multi) {
        const req = index.openCursor(parseRange(range), 'prev')
        const keys = {} // count unique keys

        return request(req, (cursor) => {
          if (!keys[cursor.key]) {
            keys[cursor.key] = true
            iterator(cursor)
          } else {
            cursor.continue()
          }
        })
      }
      const req = index.openCursor(parseRange(range), direction || 'next')
      return request(req, iterator)
    })
  }
}
