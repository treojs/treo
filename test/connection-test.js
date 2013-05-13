describe('Connection and schema management', function() {
  var expect     = chai.expect;
  var localStore = require('store');
  var Indexed    = require('indexed');

  it('connect to multiply stores in one db', function(done) {
    Indexed.drop('testapp', function(err) {
      var notes    = Indexed.create('testapp:notes');
      var tags     = Indexed.create('testapp:tags');
      var notepads = Indexed.create('testapp:notepads');

      async.series([
        function(cb) { notes(cb); },
        function(cb) { tags(cb); },
        function(cb) { notepads(cb); }
      ], function(err) {
        var config = localStore('indexed-testapp');
        expect(config.stores).length(3);
        expect(Object.keys(config.keys)).eql(['notes', 'tags', 'notepads']);
        expect(config.version).equal(4);
        done(err);
      });
    });
  });

  it('updates db.version when key was changed', function(done) {
    Indexed.drop('testapp2', function(err1) {
      var notes = Indexed.create('testapp2:notes', { key: '_id' });
      notes(1, { name: 'note 1' }, function(err2) {
        var changedNotes = Indexed.create('testapp2:notes', { key: 'id' });

        async.series([
          function(cb) { changedNotes(cb); },
          function(cb) { notes(cb); }
        ], function(err3, result) {
          var config = localStore('indexed-testapp2');

          expect(result).length(2);
          expect(result[0]).length(0);
          expect(config.version).equal(3);
          done(err1 || err2 || err3);
        });
      });
    });
  });
});
