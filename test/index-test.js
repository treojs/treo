describe('CRUD', function(){
  var expect  = chai.expect;
  var Indexed = require('indexed');
  if (!Indexed.supported) return;

  var indexed = new Indexed('notepad:notes', { key: '_id' });
  beforeEach(function(done) {
    indexed.clear(done);
  });

  it('validates name paramether', function() {
    expect(function() {
      new Indexed();
    }).throw(/name/);
  });

  it('uses different keys', function(done) {
    async.series([
      function(cb) { indexed.put([1], { name: 'note 1' }, cb); },
      function(cb) { indexed.put([2], { name: 'note 2' }, cb); },
      function(cb) { indexed.put('key', { name: 'note 3' }, cb); },
      function(cb) { indexed.put(['doom', 3, [1, 2]], { name: 'note 4' }, cb); },
      function(cb) { indexed.put('a b c', { name: 'note 5' }, cb); }
    ], done);
  });

  describe('all', function() {
    it('returns an empty array', function(done) {
      indexed.all(function(err, values) {
        expect(values).length(0);
        done(err);
      });
    });

    it('returns a list of objects', function(done) {
      async.series([
        function(cb) { indexed.put(1, { name: 'note 1' }, cb); },
        function(cb) { indexed.put(2, { name: 'note 2' }, cb); },
        function(cb) { indexed.put(3, { name: 'note 3' }, cb); },
        function(cb) { indexed.put(4, { name: 'note 4' }, cb); }
      ], function(err1) {
        indexed.all(function(err2, notes) {
          expect(notes).length(4);
          done(err1 || err2);
        });
      });
    });
  });

  describe('get', function() {
    beforeEach(function(done) {
      async.series([
        function(cb) { indexed.put(1, { name: 'note 1' }, cb); },
        function(cb) { indexed.put(2, { name: 'note 2' }, cb); },
        function(cb) { indexed.put(3, { name: 'note 3' }, cb); }
      ], done);
    });

    it('returns one value', function(done) {
      indexed.get(2, function(err, note) {
        expect(note._id).equal(2);
        done(err);
      });
    });

    it('returns undefined when key is not found', function(done) {
      indexed.get(5, function(err, note) {
        expect(note).undefined;
        done(err);
      });
    });
  });

  describe('put', function() {
    it('updates value in the store', function(done) {
      indexed.put(5, { name: 'note 5' }, function(err, note) {
        expect(note.name).equal('note 5');
        expect(err).null;
        done(err);
      });
    });
  });

  describe('del', function() {
    it('deletes object by key', function(done) {
      async.series([
        function(cb) { indexed.put(5, { name: 'note 5' }, cb); },
        function(cb) { indexed.del(5, cb); },
        function(cb) { indexed.all(function(err, notes) {expect(notes).length(0); cb(err); }); }
      ], done);
    });
  });
});

describe('Schema management', function() {
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

