import ie from './treo-ie'
import websql from 'treo-websql'
import treo from '../../src'
import Promise from 'es6-promise'

Promise.polyfill()
websql(treo) // patch to support WebSQL env
ie(treo)

/**
 * Expose treo.
 */

export default treo
