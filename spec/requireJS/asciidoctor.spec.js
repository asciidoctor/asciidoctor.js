define(['asciidoctor', 'asciidoctor/docbook', 'common-spec'], function (asciidoctor, asciidoctorDocbook, commonSpec) {

  var testOptions = {
    platform: 'RequireJS',
    baseDir: 'http://localhost:9876/base'
  };

  commonSpec(testOptions, asciidoctor);
});
