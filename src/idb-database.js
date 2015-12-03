import Emitter from 'component-emitter'
import { del } from 'idb-factory'
import sEmitter from 'storage-emitter'
import Store from './idb-store'

export default class Database extends Emitter {

  /**
   * Initialize new `Database` instance.
   *
   * @param {IDBDatabase} db
   */

  constructor(db) {
    super()
    this.db = db
    this.db.onerror = (e) => {
      this.emit('error', e.target.error)
    }
    this.db.onversionchange = () => {
      this.close()
      this.emit('versionchange')
    }
    sEmitter.once('versionchange', ({ name, version, isDelete }) => {
      if (name === this.name && (version > this.version || isDelete)) {
        this.close()
        this.emit('versionchange')
      }
    })
    this.stores.forEach((storeName) => {
      if (typeof this[storeName] !== 'undefined') return
      Object.defineProperty(this, storeName, {
        get() { return this.store(storeName) },
      })
    })
  }

  /**
   * Get name.
   *
   * @return {String}
   */

  get name() {
    return this.db.name
  }

  /**
   * Get version.
   *
   * @return {Number}
   */

  get version() {
    return this.db.version
  }

  /**
   * Get stores names.
   *
   * @return {Array}
   */

  get stores() {
    return [].slice.call(this.db.objectStoreNames)
  }

  /**
   * Delete database.
   *
   * @return {Promise}
   */

  del() {
    sEmitter.emit('versionchange', { name: this.name, isDelete: true })
    return del(this.db)
  }

  /**
   * Close database.
   */

  close() {
    this.db.close()
  }

  /**
   * Get store by `name`.
   *
   * @param {String} name
   * @return {Store}
   */

  store(name) {
    if (this.stores.indexOf(name) === -1) throw new TypeError(`"${name}" store does not exist`)
    return new Store(this.db, name)
  }
}
