describe('Indexed', function() {
  var expect  = chai.expect;
  localStorage.clear();

  ['indexeddb', 'localstorage'].forEach(function(adapter) {
    var Indexed = require('indexed/lib/' + adapter);
    if (!Indexed.supported) return;

    describe('CRUD - ' + adapter, function() {
      var notes = new Indexed('notepad:notes', { key: '_id' });

      beforeEach(function(done) {
        notes.clear(done);
      });

      it('validates name paramether', function() {
        expect(function() {
          new Indexed();
        }).throw(/name/);
      });

      it('uses different keys', function(done) {
        async.series([
          function(cb) { notes.put([1], { name: 'note 1' }, cb); },
          function(cb) { notes.put([2], { name: 'note 2' }, cb); },
          function(cb) { notes.put('key', { name: 'note 3' }, cb); },
          function(cb) { notes.put(['doom', 3, [1, 2]], { name: 'note 4' }, cb); },
          function(cb) { notes.put('a b c', { name: 'note 5' }, cb); }
        ], function(err, result) {
          expect(result[0]._id).eql([1]);
          expect(result[0].name).equal('note 1');

          notes.get(['doom', 3, [1, 2]], function(err2, note) {
            expect(note.name).equal('note 4');
            done(err || err2);
          });
        });
      });

      describe('all', function() {
        it('returns an empty array', function(done) {
          notes.all(function(err, values) {
            expect(values).length(0);
            done(err);
          });
        });

        it('returns a list of objects', function(done) {
          async.series([
            function(cb) { notes.put(1, { name: 'note 1' }, cb); },
            function(cb) { notes.put(2, { name: 'note 2' }, cb); },
            function(cb) { notes.put(3, { name: 'note 3' }, cb); },
            function(cb) { notes.put(4, { name: 'note 4' }, cb); }
          ], function(err) {
            notes.all(function(err2, notes) {
              expect(notes).length(4);
              done(err || err2);
            });
          });
        });
      });

      describe('get', function() {
        beforeEach(function(done) {
          async.series([
            function(cb) { notes.put(1, { name: 'note 1' }, cb); },
            function(cb) { notes.put(2, { name: 'note 2' }, cb); },
            function(cb) { notes.put(3, { name: 'note 3' }, cb); }
          ], done);
        });

        it('returns one value', function(done) {
          notes.get(2, function(err, note) {
            expect(note._id).equal(2);
            done(err);
          });
        });

        it('returns undefined when key is not found', function(done) {
          notes.get(5, function(err, note) {
            expect(note).undefined;
            done(err);
          });
        });
      });

      describe('put', function() {
        it('updates value in the store', function(done) {
          notes.put(5, { name: 'note 5' }, function(err, note) {
            expect(note.name).equal('note 5');
            expect(err).null;
            done(err);
          });
        });
      });

      describe('del', function() {
        it('deletes object by key', function(done) {
          async.series([
            function(cb) { notes.put(5, { name: 'note 5' }, cb); },
            function(cb) { notes.del(5, cb); },
            function(cb) { notes.all(function(err, notes) {expect(notes).length(0); cb(err); }); }
          ], done);
        });
      });

      describe('clear', function() {
        it('removes only values related with name', function(done) {
          var tags = new Indexed('notepad:tags');

          async.series([
            function(cb) { tags.clear(cb); },
            function(cb) { notes.put(1, { name: 'note 1' }, cb); },
            function(cb) { notes.put(2, { name: 'note 2' }, cb); },
            function(cb) { tags.put(1, { name: 'tag 3' }, cb); },
            function(cb) { tags.put(2, { name: 'tag 4' }, cb); }
          ], function(err) {
            notes.clear(function(err2) {
              tags.all(function(err3, values) {
                expect(values).length(2);
                done(err || err2 || err3);
              });
            });
          });
        });
      });
    });

    describe('Schema management', function() {
      it('connect to multiply stores in one db', function(done) {
        Indexed.dropDb('testapp1', function(err) {
          var notes    = new Indexed('testapp1:notes');
          var tags     = new Indexed('testapp1:tags');
          var notepads = new Indexed('testapp1:notepads');

          async.series([
            function(cb) { notes.all(cb); },
            function(cb) { tags.all(cb); },
            function(cb) { notepads.all(cb); }
          ], function(err) {
            // var config = Indexed.configs.testapp1;
            // expect(config.stores).length(3);
            // expect(Object.keys(config.keys)).eql(['notes', 'tags', 'notepads']);
            // expect(config.version).equal(4);
            done(err);
          });
        });
      });

      it('updates db.version when key was changed', function(done) {
        Indexed.dropDb('testapp2', function(err) {
          var notes = new Indexed('testapp2:notes', { key: '_id' });
          notes.put(1, { name: 'note 1' }, function(err2) {
            var changedNotes = new Indexed('testapp2:notes', { key: 'id' });

            async.series([
              function(cb) { changedNotes.all(cb); },
              function(cb) { notes.all(cb); }
            ], function(err3, result) {
              // var config = Indexed.configs.testapp2;
              expect(result).length(2);
              expect(result[0]).length(0);
              // expect(config.version).equal(3);
              done(err || err2 || err3);
            });
          });
        });
      });

      it('connects to multiply databases', function(done) {
        async.series([
          function(cb) { Indexed.dropDb('testapp4', cb); },
          function(cb) { Indexed.dropDb('testapp5', cb); },
          function(cb) { Indexed.dropDb('testapp6', cb); }
        ], function(err) {
          var notes    = new Indexed('testapp4:notes');
          var tags     = new Indexed('testapp5:tags');
          var notepads = new Indexed('testapp6:notepads');

          async.series([
            function(cb) { notes.all(cb); },
            function(cb) { tags.all(cb); },
            function(cb) { notepads.all(cb); }
          ], function(err2) {
            // expect(Indexed.configs.testapp4.version).equal(2);
            // expect(Indexed.configs.testapp5.version).equal(2);
            // expect(Indexed.configs.testapp6.version).equal(2);
            done(err || err2);
          });
        });
      });
    });
  });
});