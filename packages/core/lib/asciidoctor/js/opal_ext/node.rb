# backtick_javascript: true

%x(
  var isElectron = typeof navigator === 'object' && typeof navigator.userAgent === 'string' && typeof navigator.userAgent.indexOf('Electron') !== -1,
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

  ioModule = ioModule || 'node';
  platform = platform || 'node';
  engine = engine || 'v8';
  if (isElectron) {
    framework = framework || 'electron';
  } else {
    framework = framework || '';
  }
)

JAVASCRIPT_IO_MODULE = %x(ioModule)
JAVASCRIPT_PLATFORM = %x(platform)
JAVASCRIPT_ENGINE = %x(engine)
JAVASCRIPT_FRAMEWORK = %x(framework)

if JAVASCRIPT_FRAMEWORK == 'electron'
  require 'asciidoctor/js/opal_ext/electron/io'
end

%x(
// Load Opal modules
Opal.load("pathname");
Opal.load("nodejs");
)
