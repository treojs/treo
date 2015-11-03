## 0.5.1 / 2015-11-03

  * fix IE/Edge InvalidAccessError [#37](https://github.com/treojs/treo/pull/37) [@unkillbob](https://github.com/unkillbob)
  * deps: IndexedDBShim@2.2.1, idb-request@3.0.0, promise@7.0.4
  * use component-type@1.1.0 to prevent size blow [#22](https://github.com/component/type/issues/22)

## 0.5.0 / 2015-04-01

  * add support for multi-field indexes [#24](https://github.com/treojs/treo/issues/24)
  * add support for web-worker environment
  * deps: idb-range@2.3.0
  * add LICENSE file

## 0.4.3 / 2015-03-09

  * add support for iOS 8.1.3 [#26](https://github.com/treojs/treo/pull/26)

Thanks: [@mariusk](https://github.com/mariusk)

## 0.4.2 / 2015-02-13

  * fix the iOS issue on IndexedDBShim [#21](https://github.com/treojs/treo/pull/21)

Thanks: [@capsula4](https://github.com/capsula4)

## 0.4.1 / 2015-01-17

  * use [idb-range](https://github.com/treojs/idb-range), and remove treo.range
  * handle `onversionchange` automatically and close db [#17](https://github.com/treojs/treo/issues/16)

## 0.4.0 / 2015-01-16 [PR](https://github.com/treojs/treo/pull/18)

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
