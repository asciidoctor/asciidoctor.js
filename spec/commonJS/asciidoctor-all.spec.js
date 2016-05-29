var path = require('path');
var commonSpec = require('../share/common-specs.js');
var asciidoctor = require('../../build/npm/asciidoctor-core.js')(false, XMLHttpRequest)  ;
console.log(__dirname);
var testOptions = {
  platform: 'CommonJs',
  baseDir: 'http://localhost:9876/base'
};
commonSpec(testOptions, asciidoctor.Opal, asciidoctor.Asciidoctor(true));


var Opal = asciidoctor.Opal;
var Asciidoctor = asciidoctor.Asciidoctor(true);

describe('Include', function() {
  it('Should include file', function() {
    var opts = Opal.hash({'safe': 'safe'});
    var html = Asciidoctor.$convert('include::https://raw.githubusercontent.com/HubPress/dev.hubpress.io/gh-pages/README.adoc[]', opts);

    expect(html).toContain('Gratipay');
  });

  it('Should include file', function() {
    var opts = Opal.hash({'safe': 'safe'});
    var html = Asciidoctor.$convert('= Title\n\
\n\
include::https://raw.githubusercontent.com/HubPress/dev.hubpress.io/gh-pages/README.adoc[]', opts);

    // FIXME This test fail because this error occures
    // asciidoctor: ERROR: https://raw.githubusercontent.com/HubPress/dev.hubpress.io/gh-pages/README.adoc: line 5: only book doctypes can contain level 0 sections
    expect(html).toContain('Gratipay');
  });
});
