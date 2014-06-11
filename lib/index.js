
/**
 * Expose `Index`.
 */

module.exports = Index;

/**
 * Initialize new `Index`.
 *
 * @param {name} String
 */

function Index(store, name, field, opts) {
  this.store = store;
  this.store.indexes.push(this);
  this.name = name;
  this.field = field;
  this.unique = opts.unique;
}

/**
 * Return name with store prefix.
 *
 * @return {String}
 */

Index.prototype.fullName = function() {
  return this.store.name + '-' + this.name;
};
