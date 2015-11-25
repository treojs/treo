# treo-polyfill

[![](https://img.shields.io/npm/v/treo-polyfill.svg)](https://npmjs.org/package/treo-polyfill)
[![](http://img.shields.io/npm/dm/treo-polyfill.svg)](https://npmjs.org/package/treo-polyfill)

> Fallback to WebSQL when IndexedDB is not available.

TODO:
- think about description
- treo-websql
- describe issues

## Installation

    npm install --save treo-polyfill

## Example


```js
import treo from 'treo'
import treoPolyfill from 'treo-polyfill'

// patch treo and setup IndexedDB env
treoPolyfill(treo)

const schema = treo.schema().addStore('books')
const db = treo('mydb', schema)

// works everywhere
db.store('books').get('key').then((book) => {})
```

## treoPolyfill([treo])

## License

[MIT](../../LICENSE)
