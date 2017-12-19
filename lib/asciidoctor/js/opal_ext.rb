%x(
  var isNode = typeof process === 'object' && typeof process.versions === 'object' && process.browser != true,
      isElectron = typeof navigator === 'object' && typeof navigator.userAgent === 'string' && typeof navigator.userAgent.indexOf('Electron') !== -1,
      isBrowser = typeof window === 'object',
      isNashorn = typeof Java === 'object' && Java.type,
      isRhino = typeof java === 'object',
      isPhantomJS = typeof window === 'object' && typeof window.phantom === 'object',
      isWebWorker = typeof importScripts === 'function',
      isSpiderMonkey = typeof JSRuntime === 'object',
      platform,
      engine,
      framework,
      ioModule;

  // Load common modules
  Opal.load("pathname");
  Opal.load("base64");

  if (typeof moduleConfig === 'object' && typeof moduleConfig.runtime === 'object') {
    var runtime = moduleConfig.runtime;
    platform = runtime.platform;
    engine = runtime.engine;
    framework = runtime.framework;
    ioModule = runtime.ioModule;
  }

  if (typeof platform === 'undefined') {
    // Try to automatically detect the JavaScript platform, engine and framework
    if (isNode) {
      platform = platform || 'node';
      engine = engine || 'v8';
      if (isElectron) {
        framework = framework || 'electron';
      }
    }
    else if (isNashorn) {
      platform = platform || 'java';
      engine = engine || 'nashorn';
    }
    else if (isRhino) {
      platform = platform || 'java';
      engine = engine || 'rhino';
    }
    else if (isSpiderMonkey) {
      platform = platform || 'standalone';
      framework = framework || 'spidermonkey';
    }
    else if (isBrowser) {
      platform = platform || 'browser';
      if (isPhantomJS) {
        framework = framework || 'phantomjs';
      }
    }
    // NOTE: WebWorker are not limited to browser
    if (isWebWorker) {
      framework = framework || 'webworker';
    }
  }

  if (typeof platform === 'undefined') {
    throw new Error('Unable to automatically detect the JavaScript platform, please configure Asciidoctor.js: `Asciidoctor({runtime: {platform: \'node\'}})`');
  }

  // Optional information
  if (typeof framework === 'undefined') {
    framework = '';
  }
  if (typeof engine === 'undefined') {
    engine = '';
  }

  // IO Module
  if (typeof ioModule !== 'undefined') {
    if (ioModule != 'spidermonkey'
         && ioModule != 'phantomjs'
         && ioModule != 'node'
         && ioModule != 'java_nio'
         && ioModule != 'xmlhttprequest') {
      throw new Error('Invalid IO module, `config.ioModule` must be one of: spidermonkey, phantomjs, node, java_nio or xmlhttprequest');
    }
  } else {
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
    } else {
      throw new Error('Unable to automatically detect the IO module, please configure Asciidoctor.js: `Asciidoctor({runtime: {ioModule: \'node\'}})`');
    }
  }

)

JAVASCRIPT_IO_MODULE = %x(ioModule)
JAVASCRIPT_PLATFORM = %x(platform)
JAVASCRIPT_ENGINE = %x(engine)
JAVASCRIPT_FRAMEWORK = %x(framework)

require 'asciidoctor/js/opal_ext/file'
require 'asciidoctor/js/opal_ext/match_data'
require 'asciidoctor/js/opal_ext/kernel'
require 'asciidoctor/js/opal_ext/thread_safe'
require 'asciidoctor/js/opal_ext/string'
require 'asciidoctor/js/opal_ext/uri'

if JAVASCRIPT_ENGINE == 'nashorn'
  require 'asciidoctor/js/opal_ext/nashorn/io'
  require 'asciidoctor/js/opal_ext/nashorn/dir'
end
if JAVASCRIPT_FRAMEWORK == 'electron'
  require 'asciidoctor/js/opal_ext/electron/io'
end
if JAVASCRIPT_PLATFORM == 'node'
  require 'asciidoctor/js/opal_ext/node/file'
  `Opal.load("nodejs")`
end
