import sEmitter from 'storage-emitter'
import { open } from 'idb-factory'
import Database from './idb-database'

export default function treo(name, version, upgradeCallback) {
  if (typeof name !== 'string') throw new TypeError('"name" is required')
  if (typeof version !== 'undefined') sEmitter.emit('versionchange', { name, version })
  return open(name, version, upgradeCallback).then((db) => new Database(db))
}

export { default as Database } from './idb-database'
export { default as Store } from './idb-store'
export { default as Index } from './idb-index'
