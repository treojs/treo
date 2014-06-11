
/**
 * Expose `Store`.
 */

module.exports = Store;

/**
 * Initialize new `Store`.
 *
 * @param {name} String
 */

function Store(name) {
  if (!(this instanceof Store)) return new Store(name);
  this.name = name;
  this.indexes = [];
  this.db = null;
}
