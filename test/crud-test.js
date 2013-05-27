describe('CRUD', function(){
  var expect  = chai.expect;
  var Indexed = require('indexed');
  if (!Indexed.supported) return;
  var indexed = new Indexed('notepad:notes', { key: '_id' });

  beforeEach(function(done) {
    indexed.clear(done);
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

  describe('keys', function() {
    beforeEach(function(done) {
      async.series([
        function(cb) { indexed.put([1], { name: 'note 1' }, cb); },
        function(cb) { indexed.put([2], { name: 'note 2' }, cb); },
        function(cb) { indexed.put('key', { name: 'note 3' }, cb); },
        function(cb) { indexed.put(['doom', 3, [1, 2]], { name: 'note 4' }, cb); },
        function(cb) { indexed.put('a b c', { name: 'note 5' }, cb); }
      ], done);
    });

    it('allows to delete by array key', function(done) {
      indexed.del([1], function(err1) {
        indexed.all(function(err2, values) {
          expect(values).length(4);
          done(err1 || err2);
        });
      });
    });

    it('allows to get access by complex key', function(done) {
      indexed.get(['doom', 3, [1, 2]], function(err, note) {
        expect(note.name).equal('note 4');
        done(err);
      });
    });
  });

  describe('errors', function() {
    it('validates name paramether', function() {
      expect(function() {
        new Indexed('smth here');
      }).throw(/format/);
    });

    it('returns error when key is invalid', function(done) {
      indexed.put({ key: 1 }, {}, function(err, note) {
        expect(err).exists;
        done();
      });
    });

    it('throws error when cb is not a function', function() {
      expect(function() {
        indexed.all('smth here');
      }).throw(/callback/);
    });

    it('validates arguments count', function() {
      expect(function() {
        indexed.put(1, function() {});
      }).throw(/method has 3 arguments/);
    });
  });
});
