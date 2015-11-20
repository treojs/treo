import Emitter from 'component-emitter'

export default class Transaction extends Emitter {

  /**
   * Initialize new `Transaction`.
   *
   * @param {Database} db
   * @param {Array} scope
   * @param {String} mode
   */

  constructor(db, scope, mode) {
    super()
    this.db = db
    this.origin = null
    this.status = 'close'
    this.scope = scope
    this.mode = mode
    this.promise = new Promise((resolve, reject) => {
      this.on('complete', resolve)
      this.on('error', reject)
      this.on('abort', reject)
    })
  }

  /**
   * Create new `Store` in the scope of current transaction.
   *
   * @param {String} name
   * @return {Store}
   */

  store(name) {
    if (this.scope.indexOf(name) === -1) throw new TypeError('name out of scope')
    if (this.status === 'error' || this.status === 'complete') throw new TypeError('transaction is inactive')
    return this.db.store(name, this)
  }

  /**
   * Abort current transaction.
   *
   * @return {Promise}
   */

  abort() {
    return this.getInstance().then((tr) => {
      tr.abort()
    })
  }

  /**
   * Make transaction thenable.
   *
   * @param {Function} onResolve
   * @param {Function} onReject
   * @return {Promise}
   */

  then(onResolve, onReject) {
    return this.promise.then(onResolve, onReject)
  }

  /**
   * Catch transaction error.
   *
   * @param {Function} onReject
   * @return {Promise}
   */

  catch(onReject) {
    return this.promise.then(null, onReject)
  }

  /**
   * Get raw transaction instance.
   * Logic is identical to db.getInstance().
   *
   * @return {Promise}
   */

  getInstance() {
    if (this.status === 'ready') return Promise.resolve(this.origin)
    if (this.status === 'initializing') return this.dbPromise
    if (this.status === 'error') throw new Error('transaction error')
    if (this.status === 'complete' || this.status === 'abort') throw new Error('transaction is inactive')

    this.status = 'initializing'
    this.dbPromise = new Promise((resolve, reject) => {
      this.db.getInstance().then((db) => {
        const tr = db.transaction(this.scope, this.mode)
        delete this.dbPromise
        this.status = 'ready'
        this.origin = tr
        tr.onerror = (e) => this.onerror(e)
        tr.oncomplete = () => this.oncomplete()
        tr.onabort = () => this.onabort()
        resolve(tr)
      }).catch((err) => {
        delete this.dbPromise
        this.status = 'error'
        reject(err)
      })
    })

    return this.dbPromise
  }

  /**
   * Error hook.
   *
   * @param {Error} err
   */

  onerror(err) {
    this.status = 'error'
    this.emit('error', err)
  }

  /**
   * Complete hook.
   */

  oncomplete() {
    this.status = 'complete'
    this.emit('complete')
  }

  /**
   * Abort hook.
   */

  onabort() {
    this.status = 'aborted'
    this.emit('abort')
  }
}
