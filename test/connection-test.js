describe('Connection and schema management', function() {
  var expect  = chai.expect;
  var store   = require('store');
  var Indexed = require('indexed');
  if (!Indexed.supported) return;

  it('connect to multiply stores in one db', function(done) {
    Indexed.drop('testapp1', function(err) {
      var notes    = new Indexed('testapp1:notes');
      var tags     = new Indexed('testapp1:tags');
      var notepads = new Indexed('testapp1:notepads');

      async.series([
        function(cb) { notes.all(cb); },
        function(cb) { tags.all(cb); },
        function(cb) { notepads.all(cb); }
      ], function(err) {
        var config = store('indexed-testapp1');
        expect(config.stores).length(3);
        expect(Object.keys(config.keys)).eql(['notes', 'tags', 'notepads']);
        expect(config.version).equal(4);
        done(err);
      });
    });
  });

  it('updates db.version when key was changed', function(done) {
    Indexed.drop('testapp2', function(err1) {
      var notes = new Indexed('testapp2:notes', { key: '_id' });
      notes.put(1, { name: 'note 1' }, function(err2) {
        var changedNotes = new Indexed('testapp2:notes', { key: 'id' });

        async.series([
          function(cb) { changedNotes.all(cb); },
          function(cb) { notes.all(cb); }
        ], function(err3, result) {
          var config = store('indexed-testapp2');

          expect(result).length(2);
          expect(result[0]).length(0);
          expect(config.version).equal(3);
          done(err1 || err2 || err3);
        });
      });
    });
  });

  it('handles empty localStorage', function(done) {
    Indexed.drop('testapp3', function(err1) {
      var notes = new Indexed('testapp2:notes');
      notes.all(function(err2, all) {
        store('indexed-testapp3', null);

        notes = new Indexed('testapp3:notes');
        notes.all(function(err3, all) {
          expect(store('indexed-testapp3').version).equal(2);
          done(err1 || err2 || err3);
        });
      });
    });
  });

  it('connects to multiply databases', function(done) {
    async.series([
      function(cb) { Indexed.drop('testapp4', cb); },
      function(cb) { Indexed.drop('testapp5', cb); },
      function(cb) { Indexed.drop('testapp6', cb); }
    ], function(err1) {
      var notes    = new Indexed('testapp4:notes');
      var tags     = new Indexed('testapp5:tags');
      var notepads = new Indexed('testapp6:notepads');

      async.series([
        function(cb) { notes.all(cb); },
        function(cb) { tags.all(cb); },
        function(cb) { notepads.all(cb); }
      ], function(err2) {
        expect(store('indexed-testapp4').version).equal(2);
        expect(store('indexed-testapp5').version).equal(2);
        expect(store('indexed-testapp6').version).equal(2);
        done(err1 || err2);
      });
    });
  });
});
