var type = require('type');
var values = require('object').values;

/**
 * Expose `Schema`.
 */

module.exports = Schema;

/**
 * Initialize new `Schema`.
 */

function Schema() {
  if (!(this instanceof Schema)) return new Schema();
  this._current = {};
  this._indexes = {};
  this._stores = {};
  this._versions = {};
}

/**
 * Define new version.
 *
 * @param {Number} version
 * @return {Schema}
 */

Schema.prototype.version = function(version) {
  if (type(version) != 'number' || version < 1 || version < this.getVersion())
    throw new TypeError('not valid version');

  this._versions[version] = { stores: [], indexes: [] };
  this._current = { version: version, store: '' };
  return this;
};

/**
 * Add store.
 *
 * @param {String} name
 * @return {Schema}
 */

Schema.prototype.addStore = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (this._stores[name]) throw new TypeError('store is already defined');

  this._versions[this.getVersion()].stores.push(name);
  this._stores[name] = true;
  this._current.store = name;
  return this;
};

/**
 * Add index.
 *
 * @param {String} name
 * @param {String} field
 * @param {Object} [opts] { unique: false }
 * @return {Schema}
 */

Schema.prototype.addIndex = function(name, field, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (this._indexes[name]) throw new TypeError('index is already defined');
  if (type(field) != 'string') throw new TypeError('`field` is required');
  if (!opts) opts = {};
  var index = { name: name, field: field, opts: opts };

  this._versions[this.getVersion()].indexes.push(index);
  this._indexes[name] = index;
  return this;
};

/**
 * Get store.
 *
 * @param {String} name
 * @return {Schema}
 */

Schema.prototype.getStore = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (!this._stores[name]) throw new TypeError('store is not defined');
  this._current.store = name;
  return this;
};

/**
 * Get version.
 *
 * @return {Number}
 */

Schema.prototype.getVersion = function() {
  return this._current.version;
};

/**
 * Get all defined stores.
 */

Schema.prototype.getStores = function() {
  return values(this._stores);
};
