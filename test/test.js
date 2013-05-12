describe('Indexed.create', function(){
  var expect  = chai.expect;
  var Indexed = require('indexed');
  var indexed = Indexed.create('notepad:notes');

  beforeEach(function(done) {
    indexed(null, done);
  });

  it('returns a function', function(){
    expect(indexed).a('function');
  });

  it('validates name paramether');

  describe('indexed(cb)', function() {
    it('returns an empty array', function(done) {
      indexed(function(err, values) {
        expect(values).length(0);
        done(err);
      });
    });

    it('throws error when cb is not defined', function() {
      expect(indexed).throw(/callback required/);
    });

    it('returns a list of objects', function(done) {
      async.series([
        function(next) { indexed(1, { name: 'note 1' }, next); },
        function(next) { indexed(2, { name: 'note 2' }, next); },
        function(next) { indexed(3, { name: 'note 3' }, next); },
        function(next) { indexed(4, { name: 'note 4' }, next); }
      ], function(err) {
        if (err) return done(err);

        indexed(function(err, notes) {
          expect(notes).length(4);
          done(err);
        });
      });
    });
  });

  describe('indexed(key, cb)', function() {
    it('gets value by key', function(done) {
      indexed(1, { name: 'note 1' }, function(err1) {
        indexed(1, function(err2, note) {
          expect(note.id).equal(1);
          expect(note.name).equal('note 1');
          done(err1 || err2);
        });
      });
    });

    it('clears store when key is null', function() {
      async.series([
        function(next) { indexed(1, { name: 'note 1' }, next); },
        function(next) { indexed(2, { name: 'note 2' }, next); },
        function(next) { indexed(3, { name: 'note 3' }, next); },
        function(next) { indexed(null, next); }
      ], function(err) {
        if (err) return done(err);

        indexed(function(err, notes) {
          expect(notes).length(1);
          done(err);
        });
      });
    });
  });
});
