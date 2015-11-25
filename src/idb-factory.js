export function open(dbName, version, upgradeneeded) {
  return new Promise((resolve, reject) => {
    let isFirst = true
    const openDb = () => {
      const req = version ? idb().open(dbName, version) : idb.open(dbName)
      req.onblocked = () => {
        if (isFirst) {
          isFirst = false
          setTimeout(openDb, 100)
        } else {
          reject(new Error('database is blocked'))
        }
      }
      req.onupgradeneeded = upgradeneeded
      req.onerror = (e) => reject(e.target.error)
      req.onsuccess = (e) => resolve(e.target.result)
    }
    openDb()
  })
}

export function del(dbName) {
  if (typeof dbName !== 'string') {
    dbName.close()
    dbName = dbName.name
  }
  return new Promise((resolve, reject) => {
    let isFirst = true
    const delDb = () => {
      const req = idb().deleteDatabase(dbName)
      req.onblocked = () => {
        if (isFirst) {
          isFirst = false
          setTimeout(delDb, 100)
        } else {
          reject(new Error('database is blocked'))
        }
      }
      req.onerror = (e) => reject(e.target.error)
      req.onsuccess = () => resolve()
    }
    delDb()
  })
}

function idb() {
  return global.forceIndexedDB
      || global.indexedDB
      || global.shimIndexedDB
}
