import parseRange from 'idb-range'
import { request, requestCursor } from 'idb-request'
import { storeDescriptor } from './idb-descriptor'
import batch from 'idb-batch'
import Index from './idb-index'

export default class Store {

  /**
   * Initialize new `Store`.
   *
   * @param {IDBDatabase} db
   * @param {String} storeName
   */

  constructor(db, storeName) {
    if (typeof storeName !== 'string') throw new TypeError('"storeName" is required')
    this.db = db
    this.props = storeDescriptor(db, storeName)
    this.indexes.forEach((indexName) => {
      if (typeof this[indexName] !== 'undefined') return
      Object.defineProperty(this, indexName, {
        get() { return this.index(indexName) },
      })
    })
  }

  /**
   * Property getters.
   */

  get name() { return this.props.name }
  get key() { return this.props.keyPath }
  get increment() { return this.props.autoIncrement }
  get indexes() { return Object.keys(this.props.indexes) }

  /**
   * Get index by `name`.
   *
   * @param {String} name
   * @return {Index}
   */

  index(name) {
    if (this.indexes.indexOf(name) === -1) throw new TypeError(`"${name}" index does not exist`)
    return new Index(this.db, this.name, name)
  }

  /**
   * Add `value` to `key`.
   *
   * @param {Any} [key] is optional when store.key exists.
   * @param {Any} val
   * @return {Promise}
   */

  add(key, val) {
    if (typeof val === 'undefined') {
      val = key
      key = undefined
    }
    return batch(this.db, this.name, [{ key, val, type: 'add' }]).then(([res]) => res)
  }

  /**
   * Put (create or replace) `val` to `key`.
   *
   * @param {Any} [key] is optional when store.key exists.
   * @param {Any} val
   * @return {Promise}
   */

  put(key, val) {
    if (typeof val === 'undefined') {
      val = key
      key = undefined
    }
    return batch(this.db, this.name, [{ key, val, type: 'put' }]).then(([res]) => res)
  }

  /**
   * Del value by `key`.
   *
   * @param {String} key
   * @return {Promise}
   */

  del(key) {
    return batch(this.db, this.name, [{ key, type: 'del' }]).then(([res]) => res)
  }

  /**
   * Proxy to idb-batch.
   *
   * @param {Object|Array} ops
   * @return {Promise}
   */

  batch(ops) {
    return batch(this.db, this.name, ops)
  }

  /**
   * Clear.
   *
   * @return {Promise}
   */

  clear() {
    const tr = this.db.transaction(this.name, 'readwrite')
    return request(tr.objectStore(this.name).clear(), tr)
  }

  /**
   * Get one value by `key`.
   *
   * @param {Any} key
   * @return {Promise}
   */

  get(key) {
    const store = this.db.transaction(this.name, 'readonly').objectStore(this.name)
    return request(store.get(key))
  }

  /**
   * Count.
   *
   * @param {Any} [range]
   * @return {Promise}
   */

  count(range) {
    try {
      const store = this.db.transaction(this.name, 'readonly').objectStore(this.name)
      return request(range ? store.count(parseRange(range)) : store.count())
    } catch (_) {
      // fix https://github.com/axemclion/IndexedDBShim/issues/202
      return this.getAll(range).then((all) => all.length)
    }
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
    const store = this.db.transaction(this.name, 'readonly').objectStore(this.name)
    const req = store.openCursor(parseRange(range), direction || 'next')
    return requestCursor(req, iterator)
  }
}
