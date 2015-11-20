import 'indexeddbshim'
import './vendor/idb-iegap'
import Promise from 'es6-promise'
import treo from './treo'

Promise.polyfill()
export default treo
