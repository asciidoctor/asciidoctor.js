var commonSpec = require('../share/common-spec.js');
var asciidoctor = require('../../build/asciidoctor.js')();
require('asciidoctor-docbook.js');

var testOptions = {
  platform: 'CommonJS',
  baseDir: 'http://localhost:9876/base'
};

commonSpec(testOptions, asciidoctor);

describe('Include', function () {
  it('Should include file', function () {
    var opts = {'safe': 'safe'};
    var html = asciidoctor.convert('include::https://raw.githubusercontent.com/HubPress/dev.hubpress.io/gh-pages/README.adoc[]', opts);
    expect(html).toContain('Gratipay');
  });
});
