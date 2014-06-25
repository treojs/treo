var type = require('type');

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
  this._stores = {};
  this._versions = {};
}

/**
 * Set new version.
 *
 * @param {Number} version
 * @return {Schema}
 */

Schema.prototype.version = function(version) {
  if (type(version) != 'number' || version < 1 || version < this.getVersion())
    throw new TypeError('not valid version');

  this._versions[version] = { stores: [], indexes: [] };
  this._current = { version: version, store: null };
  return this;
};

/**
 * Add store.
 *
 * @param {String} name
 * @param {Object} [opts] { key: false }
 * @return {Schema}
 */

Schema.prototype.addStore = function(name, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (this._stores[name]) throw new TypeError('store is already defined');
  var store = { name: name, indexes: {}, opts: opts || {} };
  this._versions[this.getVersion()].stores.push(store);
  this._stores[name] = store;
  this._current.store = store;
  return this;
};

/**
 * Add index.
 *
 * @param {String} name
 * @param {String} field
 * @param {Object} [opts] { unique: false, multi: false }
 * @return {Schema}
 */

Schema.prototype.addIndex = function(name, field, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (type(field) != 'string') throw new TypeError('`field` is required');
  var store = this._current.store;
  var index = { store: store, name: name, field: field, opts: opts || {} };
  if (store.indexes[name]) throw new TypeError('index is already defined');
  store.indexes[name] = index;
  this._versions[this.getVersion()].indexes.push(index);
  return this;
};

/**
 * Change current store.
 *
 * @param {String} name
 * @return {Schema}
 */

Schema.prototype.getStore = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (!this._stores[name]) throw new TypeError('store is not defined');
  this._current.store = this._stores[name];
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
