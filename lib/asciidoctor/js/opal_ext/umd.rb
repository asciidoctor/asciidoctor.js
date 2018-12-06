%x(
  var isNode = typeof process === 'object' && typeof process.versions === 'object' && process.browser != true,
      isElectron = typeof navigator === 'object' && typeof navigator.userAgent === 'string' && typeof navigator.userAgent.indexOf('Electron') !== -1,
      isBrowser = typeof window === 'object',
      isGraalVM = typeof Polyglot === 'object' && Polyglot.import,
      isPhantomJS = typeof window === 'object' && typeof window.phantom === 'object',
      isWebWorker = typeof importScripts === 'function',
      isSpiderMonkey = typeof JSRuntime === 'object',
      platform,
      engine,
      framework,
      ioModule;

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
    else if (isGraalVM) {
      platform = platform || 'java';
      engine = engine || 'graalvm';
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
    if (ioModule !== 'spidermonkey'
         && ioModule !== 'phantomjs'
         && ioModule !== 'node'
         && ioModule !== 'graalvm'
         && ioModule !== 'xmlhttprequest') {
      throw new Error('Invalid IO module, `config.ioModule` must be one of: spidermonkey, phantomjs, node, graalvm or xmlhttprequest');
    }
  } else {
    if (framework === 'spidermonkey') {
      ioModule = 'spidermonkey';
    } else if (framework === 'phantomjs') {
      ioModule = 'phantomjs';
    } else if (platform === 'node') {
      ioModule = 'node';
    } else if (engine === 'graalvm') {
      ioModule = 'graalvm'
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

if JAVASCRIPT_ENGINE == 'graalvm' || JAVASCRIPT_IO_MODULE == 'graalvm'
  require 'asciidoctor/js/opal_ext/graalvm/dir'
  require 'asciidoctor/js/opal_ext/graalvm/file'
end
if JAVASCRIPT_FRAMEWORK == 'electron'
  require 'asciidoctor/js/opal_ext/electron/io'
end
if JAVASCRIPT_PLATFORM == 'node'
  `Opal.load("nodejs")`
end
if JAVASCRIPT_IO_MODULE == 'phantomjs'
  require 'asciidoctor/js/opal_ext/phantomjs/file'
end
if JAVASCRIPT_IO_MODULE == 'spidermonkey'
  require 'asciidoctor/js/opal_ext/spidermonkey/file'
end
if JAVASCRIPT_IO_MODULE == 'xmlhttprequest'
  require 'asciidoctor/js/opal_ext/browser/file'
end
