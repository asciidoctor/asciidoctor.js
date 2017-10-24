var TEST_REGEXP = /(\.spec|\.test)\.js$/i;
var allTestFiles = [];

Object.keys(window.__karma__.files).forEach(function (file) {
  if (TEST_REGEXP.test(file)) {
    // Normalize paths to RequireJS module names.
    // If you require sub-dependencies of test files to be loaded as-is (requiring file extension)
    // then do not normalize the paths
    var normalizedTestModule = file.replace(/^\/base\/|\.js$/g, '');
    allTestFiles.push(normalizedTestModule);
  }
});

require.config({
  baseUrl: '/base',
  paths: {
    'asciidoctor': 'build/asciidoctor',
    'asciidoctor-share-spec': 'spec/share/asciidoctor.spec',
    'asciidoctor-share-include-https-spec': 'spec/share/asciidoctor-include-https.spec',
    'asciidoctor/docbook': 'node_modules/asciidoctor-docbook.js/dist/main'
  },

  config: {
    'asciidoctor': {
      'runtime': {
        'ioModule': 'xmlhttprequest'
      }
    }
  },

  // dynamically load all test files
  deps: allTestFiles,

  // we have to kickoff jasmine, as it is asynchronous
  callback: window.__karma__.start
});
