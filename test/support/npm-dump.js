var request = require('request');
var JSONStream = require('JSONStream');
var es = require('event-stream');
var fs = require('fs');

// create file stream
var isFirst = true;
var currentLetter = '';
var file = fs.createWriteStream('test/support/npm-data.json');
file.write('[\n  ');
console.log('Load npm modules with more than one star...');

// request data
request('http://isaacs.iriscouch.com/registry/_all_docs?include_docs=true')
  .on('end', function() { file.write('\n]') })
  .pipe(JSONStream.parse('rows.*.doc'))
  .pipe(es.mapSync(prepareData))
  .pipe(file);

// parse doc data
function prepareData(data) {
  if (!data || !data.maintainers) return '';
  var stars = Object.keys(data.users || {}).length;
  if (stars < 1) return '';
  var suffix = isFirst ? '' : ',\n  ';
  isFirst = false;

  // show progress
  if (currentLetter != data.name[0]) {
    currentLetter = data.name[0];
    process.stdout.write(currentLetter);
  }

  return suffix + JSON.stringify({
    name: data.name,
    description: data.description,
    keywords: data.keywords,
    author: (data.author || {}).name || data.maintainers[0].name || '',
    repository: (data.repository || {}).url || '',
    stars: stars,
    maintainers: data.maintainers.map(function(m) { return m.name }),
  });
}
