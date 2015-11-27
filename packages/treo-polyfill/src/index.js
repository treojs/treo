import parseRange from 'idb-range'
import sEmitter from 'storage-emitter'
import ES6Promise from 'es6-promise'
import { request, requestCursor } from 'idb-request'
import { del, open } from 'idb-factory'

/**
 * Detect env.
 * Code taken from https://github.com/travisjeffery/deets/blob/master/index.js
 */

const isSafari = navigator.userAgent.indexOf('Safari') !== -1
              && navigator.userAgent.indexOf('Chrome') === -1
const noIndexedDB = typeof global.indexedDB === 'undefined'

/**
 * Enable polyfills for treo.
 *
 * @param {Object} [treo]
 */

export default function treoPolyfill(treo) {
  ES6Promise.polyfill()
  require('indexeddbshim')
  require('../vendor/idb-iegap')

  if (isSafari && getSafariVersion() < 9) {
    console.log(`treo-polyfill: force Safari ${getSafariVersion()} to use indexeddbshim`)
    global.IDBKeyRange = global.shimIndexedDB.modules.IDBKeyRange
    global.realIndexedDB = global.shimIndexedDB
  }

  if (treo && (isSafari || noIndexedDB)) {
    console.log('treo-polyfill: patch treo to support WebKit & WebSQL shim')
    patchTreo(treo)
  }
}

// In Safari, the true version is after "Safari" or after "Version"
function getSafariVersion() {
  let offset = navigator.userAgent.indexOf('Safari')
  let fullVersion = navigator.userAgent.substring(offset + 7)

  if (navigator.userAgent.indexOf('Version') !== -1) {
    offset = navigator.userAgent.indexOf('Version')
    fullVersion = navigator.userAgent.substring(offset + 8)
  }

  return parseInt(fullVersion, 10)
}

/**
 * Patch treo methods to fix inconsistency in WebSQL shim and Safari.
 */

function patchTreo(treo) {
  const { Index, Store, Database } = treo

  /**
   * Support range as an argument:
   * https://github.com/axemclion/IndexedDBShim/issues/202
   */

  Store.prototype.count =
  Index.prototype.count = function count(range) {
    return this.getAll(range).then((all) => all.length)
  }

  /**
   * Support direction=prevunique for non-multi indexes
   * https://github.com/axemclion/IndexedDBShim/issues/204
   */

  Index.prototype.cursor = function indexCursor({ iterator, range, direction }) {
    if (typeof iterator !== 'function') throw new TypeError('iterator is required')
    return this.store.db.getInstance().then((db) => {
      const index = db.transaction(this.store.name, 'readonly').objectStore(this.store.name).index(this.name)
      if (direction === 'prevunique' && !this.multi) {
        const req = index.openCursor(parseRange(range), 'prev')
        const keys = {} // count unique keys

        return requestCursor(req, (cursor) => {
          if (!keys[cursor.key]) {
            keys[cursor.key] = true
            iterator(cursor)
          } else {
            cursor.continue()
          }
        })
      }
      const req = index.openCursor(parseRange(range), direction || 'next')
      return requestCursor(req, iterator)
    })
  }

  /**
   * Fix ConstraintError in Safari and WebSQL shim
   * https://bugs.webkit.org/show_bug.cgi?id=149107
   * https://github.com/axemclion/IndexedDBShim/issues/56
   */

  Store.prototype.add = _validateIndexAndRunMethod('add')
  Store.prototype.put = _validateIndexAndRunMethod('put')

  function _validateIndexAndRunMethod(method) {
    return function putOrAdd(key, val) {
      if (this.key && typeof val !== 'undefined') {
        val[this.key] = key
      } else if (this.key) {
        val = key
      }
      return this.db.getInstance().then((db) => {
        const requests = this.indexes.map((indexName) => {
          const index = this.index(indexName)
          const indexVal = Array.isArray(index.field)
          ? index.field.map((indexKey) => val[indexKey]).filter((v) => Boolean(v))
          : val[index.field]

          return [ index, indexVal ]
        }).filter(([ index, indexVal ]) => {
          return index.unique && (Array.isArray(index.field) ? indexVal.length : indexVal)
        }).map(([ index, indexVal ]) => {
          return index.get(indexVal)
        })

        return Promise.all(requests).then((records) => {
          const uniqueRecors = records.filter((record) => Boolean(record))
          if (uniqueRecors.length) return Promise.reject(new Error('Unique index ConstraintError'))

          const tr = db.transaction(this.name, 'readwrite')
          const store = tr.objectStore(this.name)
          return request(this.key ? store[method](val) : store[method](val, key), tr)
        })
      })
    }
  }

  /**
   * For some reason, Safari can't release database immediately,
   * and can throw access error.
   * This fix waits for 100ms and also calls `versionchange`.
   */

  Database.prototype.del = function delDatabase() {
    sEmitter.emit('versionchange', { name: this.name, isDelete: true })
    return new Promise((resolve) => setTimeout(resolve, 100)).then(() => del(this))
  }

  /**
   * https://bugs.webkit.org/show_bug.cgi?id=136155
   * WebSQL shim also does not support `versionchange` event.
   */

  Database.prototype.getInstance = function getInstance() {
    if (this.status === 'open') return Promise.resolve(this.origin)
    if (this.status === 'error') return Promise.reject(new Error('database error'))
    if (this.status === 'opening') return this.promise

    sEmitter.emit('versionchange', { name: this.name, version: this.version })
    this.status = 'opening'
    this.promise = open(this.name, this.version, this.schema.callback())
    .then((db) => {
      delete this.promise
      this.status = 'open'
      this.origin = db

      db.onerror = (err) => this.emit('error', err)
      db.onversionchange = () => {
        this.close()
        this.emit('versionchange')
      }

      sEmitter.once('versionchange', ({ name, version, isDelete }) => {
        if (this.status !== 'close' && name === this.name && (version > this.version || isDelete)) {
          this.close()
          this.emit('versionchange')
        }
      })

      return db
    }).catch((err) => {
      delete this.promise
      this.status = 'error'
      throw err
    })

    return this.promise
  }
}
