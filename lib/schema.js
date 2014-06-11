var type = require('type');
var Index = require('./index');
var Store = require('./store');

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

  this._versions[version] = { stores: [], indexes: [], values: [] };
  this._current = { version: version, store: null };
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
  var store = new Store(name);

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
 * @param {Object} [opts] { unique: false }
 * @return {Schema}
 */

Schema.prototype.addIndex = function(name, field, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (type(field) != 'string') throw new TypeError('`field` is required');
  if (!opts) opts = {};
  var index = new Index(this._current.store, name, field, opts);
  if (this._indexes[index.fullName()]) throw new TypeError('index is already defined');

  this._versions[this.getVersion()].indexes.push(index);
  this._indexes[index.fullName()] = index;
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
 * Put `val` to `key`.
 *
 * @param {Any} key
 * @param {Any} val
 * @return {Schema}
 */

Schema.prototype.put = function(key, val) {
  var store = this._current.store;
  var value = { store: store, key: key, val: val };
  this._versions[this.getVersion()].values.push(value);
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
  var versions = Object.keys(this._versions);
  var that = this;
  versions = versions.map(function(v) { return parseInt(v, 10) }).sort();

  return function onupgradeneeded(e) {
    var db = e.target.result;
    var tr = e.target.transaction;

    versions.forEach(function(version) {
      if (e.oldVersion >= version) return;
      var data = that._versions[version];

      data.stores.forEach(function(store) {
        db.createObjectStore(store.name);
      });

      data.values.forEach(function(value) {
        var store = tr.objectStore(value.store.name);
        store.put(value.val, value.key);
      });

      data.indexes.forEach(function(index) {
        var store = tr.objectStore(index.store.name);
        store.createIndex(index.name, index.field, index.opts);
      });
    });
  };
};
