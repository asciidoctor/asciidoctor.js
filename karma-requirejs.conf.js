'use strict';

module.exports = function(config) {
  config.set({
    frameworks: [ 'jasmine', 'requirejs' ],

    files: [
      {pattern: 'spec/share/include.adoc', watched: false, included: false, served: true},
      {pattern: 'spec/share/sales.csv', watched: false, included: false, served: true},
      {pattern: 'spec/requireJS/asciidoctor.spec.js', watched: false, included: false, served: true},
      {pattern: 'spec/share/asciidoctor.spec.js', watched: false, included: false, served: true},
      {pattern: 'build/asciidoctor.js', watched: false, included: false, served: true},
      {pattern: 'node_modules/asciidoctor-docbook.js/dist/main.js', watched: false, included: false, served: true},
      {pattern: 'build/css/asciidoctor.css', watched: false, included: false, served: true},
      'spec/requireJS/main.js'
    ],

    reporters: [ 'dots' ],

    browsers: [ 'ChromeHeadless' ],

    logLevel: config.LOG_DEBUG,

    singleRun: true,
    autoWatch: false,

    // force the port to use
    port: 9876
  });
};
