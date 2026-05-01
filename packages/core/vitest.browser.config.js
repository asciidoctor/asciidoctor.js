import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const shim = (name) => join(__dirname, `test/shims/${name}.js`)

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    root: 'test',
    setupFiles: ['shims/setup.js'],
    include: ['**/*.test.js'],
    // Exclude tests that require a running Node.js HTTP server or Node.js test infrastructure
    exclude: ['include-http.test.js', 'blocks.images-http.test.js', 'browser.reader.test.js', 'converter.template.test.js', 'convert.test.js'],
  },
  resolve: {
    alias: [
      // Node.js built-in shims
      { find: 'node:test',          replacement: shim('node-test') },
      { find: 'node:assert/strict', replacement: shim('node-assert') },
      { find: 'node:assert',        replacement: shim('node-assert') },
      { find: 'node:url',           replacement: shim('node-url') },
      { find: 'node:path',          replacement: shim('node-path') },
      { find: 'node:module',        replacement: shim('node-module') },
      { find: 'node:fs/promises',   replacement: shim('node-fs-promises') },
      { find: 'node:fs',            replacement: shim('node-fs') },
      { find: 'node:os',            replacement: shim('node-os') },
      { find: 'node:http',          replacement: shim('node-http') },
    ],
  },
})
