describe('Connection and schema management', function() {
  var expect  = chai.expect;
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
        var config = Indexed.configs.testapp1;
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
          var config = Indexed.configs.testapp2;
          expect(result).length(2);
          expect(result[0]).length(0);
          expect(config.version).equal(3);
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
        expect(Indexed.configs.testapp4.version).equal(2);
        expect(Indexed.configs.testapp5.version).equal(2);
        expect(Indexed.configs.testapp6.version).equal(2);
        done(err1 || err2);
      });
    });
  });
});
