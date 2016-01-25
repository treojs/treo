import assign from 'object-assign'
import parseRange from 'idb-range'
import { mapCursor } from 'idb-request'

/**
 * Default options.
 */

const defaultOpts = {
  limit: Infinity,
  offset: 0,
  unique: false,
  reverse: false,
}

/**
 * Take values from `store` using `range` and `opts`:
 * - `limit` set amount of required values
 * - `offset` skip some values
 * - `reverse` take values in descendant order
 * - `unique` use unique values (for indexes)
 *
 * @param {Any} range - passes to idb-range and supports { gt, lt, gte, lte, eq }
 * @param {Object} opts
 * @return {Promise}
 */

export function take(store, range = null, opts = {}) {
  const { offset, limit, unique, reverse } = assign({}, defaultOpts, opts)
  const direction = (reverse ? 'prev' : 'next') + (unique ? 'unique' : '')
  const req = store.openCursor(parseRange(range), direction)
  let offsetCounter = offset

  return mapCursor(req, (cursor, result) => {
    if (offsetCounter === 0) {
      if (limit > result.length) result.push(cursor.value) // FIXME: exit earlier
      cursor.continue()
    } else {
      offsetCounter -= 1
      cursor.continue()
    }
  })
}

/**
 * Shortcuts.
 */

export function takeRight(store, range, opts = {}) {
  opts.reverse = true
  return take(store, range, opts)
}

export function takeOne(store, range, opts = {}) {
  return take(store, range, opts).then(([val]) => val)
}

export function takeRightOne(store, range, opts = {}) {
  return takeRight(store, range, opts).then(([val]) => val)
}
