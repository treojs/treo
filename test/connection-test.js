describe('Connection and schema management', function() {
  var expect     = chai.expect;
  var localStore = require('store');
  var Indexed    = require('indexed');

  describe('connect to multiply stores', function() {
    beforeEach(function(done) {
      Indexed.drop('testapp', function(err) {
        if (err) return done(err);
        localStorage.clear();

        var notes    = Indexed.create('testapp:notes');
        var tags     = Indexed.create('testapp:tags');
        var notepads = Indexed.create('testapp:notepads');

        async.series([
          function(cb) { notes(cb); },
          function(cb) { tags(cb); },
          function(cb) { notepads(cb); }
        ], done);
      });
    });

    it('setups config', function() {
      var config = localStore('indexed-testapp');
      expect(config.stores).length(3);
      expect(Object.keys(config.keys)).eql(['notes', 'tags', 'notepads']);
      expect(config.version).equal(4);
    });
  });

  describe('recreate store when key is changed', function() {

  });
});
