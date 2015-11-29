import parseRange from 'idb-range'
import { request, requestCursor } from 'idb-request'
import Index from './idb-index'
import batch from './idb-batch'

export default class Store {

  /**
   * Initialize new `Store`.
   *
   * @param {Database} db
   * @param {Object} opts { name, keyPath, autoIncrement, indexes }
   */

  constructor(db, opts) {
    this.db = db
    this.opts = opts.indexes
    this.name = opts.name
    this.key = opts.keyPath
    this.increment = opts.autoIncrement
    this.indexes = opts.indexes.map((index) => index.name)

    this.indexes.forEach((indexName) => {
      if (typeof this[indexName] !== 'undefined') return
      Object.defineProperty(this, indexName, {
        get() { return this.index(indexName) },
      })
    })
  }

  /**
   * Get index by `name`.
   *
   * @param {String} name
   * @return {Index}
   */

  index(name) {
    const i = this.indexes.indexOf(name)
    if (i === -1) throw new TypeError('invalid index name')
    return new Index(this, this.opts[i])
  }

  /**
   * Add `value` to `key`.
   *
   * @param {Any} [key] is optional when store.key exists.
   * @param {Any} val
   * @return {Promise}
   */

  add(key, val) {
    return this.db.getInstance().then((db) => {
      return batch(db, this.name, [{ key, val, type: 'add' }]).then(([res]) => res)
    })
  }

  /**
   * Put (create or replace) `val` to `key`.
   *
   * @param {Any} [key] is optional when store.key exists.
   * @param {Any} val
   * @return {Promise}
   */

  put(key, val) {
    return this.db.getInstance().then((db) => {
      return batch(db, this.name, [{ key, val, type: 'put' }]).then(([res]) => res)
    })
  }

  /**
   * Del value by `key`.
   *
   * @param {String} key
   * @return {Promise}
   */

  del(key) {
    return this.db.getInstance().then((db) => {
      return batch(db, this.name, [{ key, type: 'del' }]).then(([res]) => res)
    })
  }

  /**
   * Proxy to idb-batch.
   *
   * @param {Object|Array} ops
   * @return {Promise}
   */

  batch(ops) {
    return this.db.getInstance().then((db) => batch(db, this.name, ops))
  }

  /**
   * Clear.
   *
   * @return {Promise}
   */

  clear() {
    return this.db.getInstance().then((db) => {
      const tr = db.transaction(this.name, 'readwrite')
      return request(tr.objectStore(this.name).clear(), tr)
    })
  }

  /**
   * Get one value by `key`.
   *
   * @param {Any} key
   * @return {Promise}
   */

  get(key) {
    return this.db.getInstance().then((db) => {
      return request(db.transaction(this.name, 'readonly').objectStore(this.name).get(key))
    })
  }

  /**
   * Count.
   *
   * @param {Any} [range]
   * @return {Promise}
   */

  count(range) {
    return this.db.getInstance().then((db) => {
      try {
        const store = db.transaction(this.name, 'readonly').objectStore(this.name)
        return request(range ? store.count(parseRange(range)) : store.count())
      } catch (_) {
        // fix https://github.com/axemclion/IndexedDBShim/issues/202
        return this.getAll(range).then((all) => all.length)
      }
    })
  }

  /**
   * Get all.
   *
   * @param {Any} [range]
   * @return {Promise}
   */

  getAll(range) {
    const result = []
    return this.cursor({ iterator, range }).then(() => result)

    function iterator(cursor) {
      result.push(cursor.value)
      cursor.continue()
    }
  }

  /**
   * Create read cursor for specific `range`,
   * and pass IDBCursor to `iterator` function.
   *
   * @param {Object} opts:
   *   {Any} [range] - passes to .openCursor()
   *   {String} [direction] - "prev", "prevunique", "next", "nextunique"
   *   {Function} iterator - function to call with IDBCursor
   * @return {Promise}
   */

  cursor({ iterator, range, direction }) {
    if (typeof iterator !== 'function') throw new TypeError('iterator is required')
    return this.db.getInstance().then((db) => {
      const store = db.transaction(this.name, 'readonly').objectStore(this.name)
      const req = store.openCursor(parseRange(range), direction || 'next')
      return requestCursor(req, iterator)
    })
  }
}
