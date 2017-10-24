define(['asciidoctor', 'asciidoctor/docbook', 'asciidoctor-share-spec', 'asciidoctor-share-include-https-spec'], function (asciidoctor, asciidoctorDocbook, shareSpec, includeHttpsSpec) {

  var testOptions = {
    platform: 'RequireJS',
    baseDir: 'http://localhost:9876/base'
  };

  shareSpec(testOptions, asciidoctor);
  includeHttpsSpec(testOptions, asciidoctor);
});
