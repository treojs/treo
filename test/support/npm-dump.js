var request = require('request');
var JSONStream = require('JSONStream');
var es = require('event-stream');
var fs = require('fs');

// create file stream
var isFirst = true;
var file = fs.createWriteStream('test/support/npm-data.json');
file.write('[\n  ');

// request data
request('http://isaacs.iriscouch.com/registry/_all_docs?include_docs=true')
  .on('end', function() { file.write('\n]') })
  .pipe(JSONStream.parse('rows.*.doc'))
  .pipe(es.mapSync(prepareData))
  .pipe(file);

// parse doc data
function prepareData(data) {
  if (!data || !data.maintainers) return '';
  var suffix = isFirst ? '' : ',\n  ';
  isFirst = false;

  return suffix + JSON.stringify({
    name: data.name,
    description: data.description,
    keywords: data.keywords,
    author: (data.author || {}).name || data.maintainers[0].name || '',
    repository: (data.repository || {}).url || '',
    stars: Object.keys(data.users || {}).length,
    maintainers: data.maintainers.map(function(m) { return m.name }),
  });
}
