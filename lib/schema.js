var type = require('type');
var Index = require('./idb-index');
var Store = require('./idb-store');

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
  var store = new Store(name, opts || {});

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
  var index = new Index(store, name, field, opts || {});
  if (this._indexes[store.name + '-' + name])
    throw new TypeError('index is already defined');

  store.indexes[name] = index;
  this._versions[this.getVersion()].indexes.push(index);
  this._indexes[store.name + '-' + name] = index;
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

/**
 * Generate callback for `upgradeneeded` event.
 *
 * @return {Function}
 */

Schema.prototype.callback = function() {
  var that = this;
  var versions = Object.keys(this._versions)
    .map(function(v) { return parseInt(v, 10) }).sort();

  return function onupgradeneeded(e) {
    var db = e.target.result;
    var tr = e.target.transaction;

    versions.forEach(function(version) {
      if (e.oldVersion >= version) return;
      var schema = that._versions[version];

      schema.stores.forEach(function(store) {
        db.createObjectStore(store.name);
      });

      schema.indexes.forEach(function(index) {
        var store = tr.objectStore(index.store.name);
        var opts = { unique: index.unique, multiEntry: index.multi };
        store.createIndex(index.name, index.field, opts);
      });
    });
  };
};
