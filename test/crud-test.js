describe('Indexed.create instance', function(){
  var expect  = chai.expect;
  var Indexed = require('indexed');
  var indexed = Indexed.create('notepad:notes', { key: '_id' });

  beforeEach(function(done) {
    indexed(null, done);
  });

  describe('indexed(cb)', function() {
    it('returns an empty array', function(done) {
      indexed(function(err, values) {
        expect(values).length(0);
        done(err);
      });
    });

    it('returns a list of objects', function(done) {
      async.series([
        function(cb) { indexed(1, { name: 'note 1' }, cb); },
        function(cb) { indexed(2, { name: 'note 2' }, cb); },
        function(cb) { indexed(3, { name: 'note 3' }, cb); },
        function(cb) { indexed(4, { name: 'note 4' }, cb); }
      ], function(err1) {
        indexed(function(err2, notes) {
          expect(notes).length(4);
          done(err1 || err2);
        });
      });
    });
  });

  describe('indexed(key, cb)', function() {
    it('gets value by key', function(done) {
      indexed(1, { name: 'note 1' }, function(err1) {
        indexed(1, function(err2, note) {
          expect(note._id).equal(1);
          expect(note.name).equal('note 1');
          done(err1 || err2);
        });
      });
    });

    it('returns undefined when key is not found', function(done) {
      indexed(5, function(err, note) {
        expect(note).undefined;
        done(err);
      });
    });

    it('clears store when key is null', function(done) {
      async.series([
        function(cb) { indexed(1, { name: 'note 1' }, cb); },
        function(cb) { indexed(2, { name: 'note 2' }, cb); },
        function(cb) { indexed(3, { name: 'note 3' }, cb); },
        function(cb) { indexed(null, cb); }
      ], function(err1) {
        indexed(function(err2, notes) {
          expect(notes).length(0);
          done(err1 || err2);
        });
      });
    });
  });

  describe('indexed(key, val, cb)', function() {
    it('puts value to store', function(done) {
      indexed(5, { name: 'note 5' }, function(err, note) {
        expect(note.name).equal('note 5');
        expect(err).null;
        done(err);
      });
    });

    it('delete objetc by key if val is null', function(done) {
      indexed(5, { name: 'note 5' }, function(err1) {
        indexed(5, null, function(err2) {
          indexed(function(err3, notes) {
            expect(notes).length(0);
            done(err1 || err2 || err3);
          });
        });
      });
    });
  });

  describe('shortcut methods', function() {
    beforeEach(function(done) {
      async.series([
        function(cb) { indexed(1, { name: 'note 1' }, cb); },
        function(cb) { indexed(2, { name: 'note 2' }, cb); },
        function(cb) { indexed(3, { name: 'note 3' }, cb); }
      ], done);
    });

    it('all - returns all values', function(done) {
      indexed.all(function(err, notes) {
        expect(notes).length(3);
        done(err);
      });
    });

    it('get - returns one value', function(done) {
      indexed.get(2, function(err, note) {
        expect(note._id).equal(2);
        done(err);
      });
    });

    it('put - updates existing value', function(done) {
      indexed.put(3, { name: 'updated note 3' }, function(err, note) {
        expect(note._id).equal(3);
        expect(err).null;
        done(err);
      });
    });

    it('del - delete object by key', function(done) {
      indexed.del(2, function(err1) {
        indexed.all(function(err2, notes) {
          expect(notes).length(2);
          done(err1 || err2);
        });
      });
    });

    it('clear - delete all objects', function(done) {
      indexed.clear(function(err1) {
        indexed.all(function(err2, notes) {
          expect(notes).length(0);
          done(err1 || err2);
        });
      });
    });
  });

  describe('keys', function() {
    beforeEach(function(done) {
      async.series([
        function(cb) { indexed([1], { name: 'note 1' }, cb); },
        function(cb) { indexed([2], { name: 'note 2' }, cb); },
        function(cb) { indexed('key', { name: 'note 3' }, cb); },
        function(cb) { indexed(['doom', 3, [1, 2]], { name: 'note 4' }, cb); },
        function(cb) { indexed('a b c', { name: 'note 5' }, cb); }
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
    it('throws error when cb is not defined', function() {
      expect(indexed).throw(/callback required/);
    });

    it('validates name paramether', function() {
      expect(function() {
        Indexed.create('smth here');
      }).throw(/format/);
    });

    it('returns error when key is invalid', function(done) {
      indexed.put({ key: 1 }, {}, function(err, note) {
        expect(err).not.null;
        done();
      });
    });

    it('throws error when cb is not a function', function() {
      expect(function() {
        indexed('smth here');
      }).throw(/callback/);
    });

    it('validates arguments count', function() {
      expect(function() {
        indexed.put(1, function() {});
      }).throw(/method has 3 arguments/);
    });
  });
});
