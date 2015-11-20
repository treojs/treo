import Emitter from 'component-emitter'
import sEmitter from 'storage-emitter'
import Schema from 'idb-schema'
import Store from './idb-store'
import request from 'idb-request'

export default class Database extends Emitter {

  /**
   * Initialize new `Database` instance.
   *
   * @param {String} name
   * @param {Schema} schema
   */

  constructor(name, schema) {
    if (typeof name !== 'string') throw new TypeError('"name" is required')
    if (!(schema instanceof Schema)) throw new TypeError('schema is not valid')

    super()
    this.status = 'close'
    this.origin = null
    this.schema = schema
    this.opts = schema.stores()
    this.name = name
    this.version = schema.version()
    this.stores = this.opts.map((store) => store.name)
  }

  /**
   * Link to `indexedDB`.
   */

  static get idb() {
    return global.indexedDB
    || global.webkitIndexedDB
    || global.mozIndexedDB
    || global.msIndexedDB
    || global.shimIndexedDB
  }

  /**
   * Close connection && delete database.
   * After close it waits a little to avoid exception in Safari.
   *
   * @return {Promise}
   */

  del() {
    this.close()
    return new Promise((resolve) => setTimeout(resolve, 100)).then(() => {
      sEmitter.emit('versionchange', { name: this.name, isDelete: true })
      return request(Database.idb.deleteDatabase(this.name))
    })
  }

  /**
   * Close database.
   */

  close() {
    if (this.status !== 'open') return
    this.origin.close()
    this.origin = null
    this.status = 'close'
  }

  /**
   * Get store by `name`.
   *
   * @param {String} name
   * @return {Store}
   */

  store(name) {
    const i = this.stores.indexOf(name)
    if (i === -1) throw new TypeError('invalid store name')
    return new Store(this, this.opts[i])
  }

  /**
   * Get raw db instance.
   * It initiates opening transaction only once,
   * another requests will be fired on "open" event.
   *
   * @return {Promise} (IDBDatabase)
   */

  getInstance() {
    if (this.status === 'open') return Promise.resolve(this.origin)
    if (this.status === 'error') return Promise.reject(new Error('database error'))
    if (this.status === 'opening') return this.promise

    this.status = 'opening'
    this.repeatOpen = false
    this.promise = new Promise((resolve, reject) => {
      const openDB = () => {
        const req = Database.idb.open(this.name, this.version)

        req.onupgradeneeded = this.schema.callback()
        req.onerror =
        req.onblocked = (e) => {
          if (this.repeatOpen) {
            delete this.promise
            this.status = 'error'
            reject(e)
          } else {
            // safari bug, db is locked try again in 100ms
            setTimeout(() => {
              this.repeatOpen = true
              openDB()
            }, 100)
          }
        }

        req.onsuccess = (ev1) => {
          const db = ev1.target.result
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
          resolve(db)
        }
      }
      sEmitter.emit('versionchange', { name: this.name, version: this.version })
      openDB()
    })

    return this.promise
  }
}
