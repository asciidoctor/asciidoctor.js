define(['asciidoctor', 'asciidoctor/docbook', 'asciidoctor-share-spec'], function (asciidoctor, asciidoctorDocbook, shareSpec) {

  var testOptions = {
    platform: 'RequireJS',
    baseDir: 'http://localhost:9876/base'
  };

  shareSpec(testOptions, asciidoctor);
});
