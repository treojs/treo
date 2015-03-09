## 0.4.3 / 2015-03-09

  * adds support for iOS 8.1.3 [#26](https://github.com/alekseykulikov/treo/pull/26)

Thanks: [@mariusk](https://github.com/mariusk)

## 0.4.2 / 2015-02-13

  * fixes the iOS issue on IndexedDBShim [#21](https://github.com/alekseykulikov/treo/pull/21)

Thanks: [@capsula4](https://github.com/capsula4)

## 0.4.1 / 2015-01-17

  * use [idb-range](https://github.com/treojs/idb-range), and remove treo.range
  * handle `onversionchange` automatically and close db [#17](https://github.com/alekseykulikov/treo/issues/16)

## 0.4.0 / 2015-01-16 [PR](https://github.com/alekseykulikov/treo/pull/18)

  * pass treo as second argument to `db.use()`
  * add `schema.dropStore()` and `schema.dropIndex()`
  * fix iOS 8 & Safari 7.0.6, IE10 & IE11 support
  * `put` passes the key of the created/updated record to callback

Thanks: [@unkillbob](https://github.com/unkillbob) for fixing websql polyfill.

## 0.3.0 / 2014-09-24

  * add npm's files option for smaller tarbal
  * use dist folder for bower and component
  * add plugins/treo-websql pass same tests as real IndexedDB
  * add plugins/treo-promise for better promises support
  * add es6-generators example
  * update Readme #11

## 0.2.0 / 2014-09-08

  * use browserify for build instead of component(1)
  * fix npm support
  * key || keyPath, increment || autoIncretement, multi || multiEntry
  * (fix #12) schema.addStore({ increment: true }) to support autoIncrement

## 0.1.0 / 2014-07-23

  * initial release.
    It used to call indexed, and now this name exists only in git history
    as a prove of evolutionary thinking about this problem.
