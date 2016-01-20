import sEmitter from 'storage-emitter'
import { open } from 'idb-factory'
import Database from './idb-database'
import Store from './idb-store'
import Index from './idb-index'

export default function treo(name, version, upgradeCallback) {
  if (typeof name !== 'string') throw new TypeError('"name" is required')
  if (typeof version !== 'undefined') sEmitter.emit('versionchange', { name, version })
  return open(name, version, upgradeCallback).then((db) => new Database(db))
}

export { Database, Store, Index }
