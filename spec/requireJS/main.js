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
    'common-spec': 'spec/share/common-spec',
    'asciidoctor/docbook': 'node_modules/asciidoctor-docbook.js/dist/main'
  },

  config: {
    'asciidoctor': {
      'ioModule': 'phantomjs'
    }
  },

  // dynamically load all test files
  deps: allTestFiles,

  // we have to kickoff jasmine, as it is asynchronous
  callback: window.__karma__.start
});
