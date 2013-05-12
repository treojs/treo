describe('Indexed.create', function(){
  var expect  = chai.expect;
  var Indexed = require('indexed');
  var indexed = Indexed.create('notepad:notes');

  it('returns a function', function(){
    expect(indexed).a('function');
  });

  describe('indexed(cb)', function() {
    it('returns an empty array', function(done) {
      indexed(function(err, values) {
        expect(values).length(0);
        done(err);
      });
    });

    it('throws error when cb is not defined', function() {
      expect(indexed()).throw(TypeError, /callback required/);
    });

    it('returns a list of objects', function(done) {
      async.parallel([
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
});
