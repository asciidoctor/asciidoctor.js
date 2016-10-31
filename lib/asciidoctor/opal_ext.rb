%x(
  var isNode = typeof module !== 'undefined' && module.exports,
      isElectron = typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.electron === 'string',
      isBrowser = typeof window !== 'undefined',
      isNashorn = typeof Java !== 'undefined' && Java.type,
      isRhino = typeof java !== 'undefined',
      isPhantomJS = typeof window !== 'undefined' && typeof window.phantom !== 'undefined',
      isWebWorker = typeof importScripts === 'function',
      isSpiderMonkey = typeof JSRuntime !== 'undefined',
      platform = '',
      engine = '',
      framework = '',
      ioModule = '';

  // Auto-detect the platform, engine and framework of the JavaScript environment
  // NOTE: The order of the if statements is important because, for instance, 'module' will be defined in a Browserify environment
  if (isBrowser) {
    platform = 'browser';
    if (isPhantomJS) {
      framework = 'phantomjs';
    }
  }
  else if (isNode) {
    platform = 'node';
    engine = 'v8';
    if (isElectron) {
      framework = 'electron';
    }
    Opal.load("nodejs");
    Opal.load("pathname");
    Opal.load("base64");
  }
  else if (isNashorn) {
    platform = 'java';
    engine = 'nashorn';
  }
  else if (isRhino) {
    platform = 'java';
    engine = 'rhino';
  }
  else if (isSpiderMonkey) {
    platform = 'standalone';
    framework = 'spidermonkey';
  }
  // NOTE: WebWorker are not limited to browser
  if (isWebWorker) {
    framework = 'webworker';
  }

  // IO Module
  if (framework === 'spidermonkey') {
    ioModule = 'spidermonkey';
  } else if (framework === 'phantomjs') {
    ioModule = 'phantomjs';
  } else if (platform === 'node') {
    ioModule = 'node';
  } else if (engine === 'nashorn') {
    ioModule = 'java_nio'
  } else if (platform === 'browser' || typeof XmlHTTPRequest !== 'undefined') {
    ioModule = 'xmlhttprequest'
  }
)

JAVASCRIPT_IO_MODULE = %x(ioModule)
JAVASCRIPT_PLATFORM = %x(platform)
JAVASCRIPT_ENGINE = %x(engine)
JAVASCRIPT_FRAMEWORK = %x(framework)

require 'strscan'
require 'asciidoctor/opal_ext/file'
require 'asciidoctor/opal_ext/match_data'
require 'asciidoctor/opal_ext/kernel'
require 'asciidoctor/opal_ext/thread_safe'
require 'asciidoctor/converter'
require 'asciidoctor/converter/composite'
require 'asciidoctor/converter/html5'
require 'asciidoctor/opal_ext/string'
require 'asciidoctor/extensions'

if JAVASCRIPT_ENGINE == 'nashorn'
  require 'asciidoctor/opal_ext/nashorn/io'
end
if JAVASCRIPT_FRAMEWORK == 'electron'
  require 'asciidoctor/opal_ext/electron/io'
end
if JAVASCRIPT_PLATFORM == 'node'
  require 'asciidoctor/opal_ext/node/io'
end
