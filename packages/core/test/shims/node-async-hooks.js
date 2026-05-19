// Browser shim for node:async_hooks.
// AsyncLocalStorage is intentionally NOT exported — browsers lack async context propagation.
// logging.js's _ensureLoggerStore() catches the resulting TypeError and returns null,
// which causes withLogger() to fall back to global LoggerManager mutation (safe in
// sequential browser test execution).
