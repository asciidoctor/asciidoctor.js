import json from '@rollup/plugin-json'

// Converts `await import('node:X')` → `require('node:X')` so that
// top-level await (used for optional Node.js module loading) is
// compatible with CJS output format.
function nodeAwaitImportToRequire () {
  return {
    name: 'node-await-import-to-require',
    transform (code) {
      if (!code.includes("await import('node:")) return null
      return { code: code.replaceAll(/await import\('(node:[^']+)'\)/g, "require('$1')"), map: null }
    },
  }
}

// Replaces TemplateConverter (filesystem-based) with a browser stub that throws
// a clear error if template_dirs is used in a browser environment.
function browserTemplateConverterStub () {
  const STUB_ID = '\0browser:template-converter'
  return {
    name: 'browser-template-converter-stub',
    resolveId (id, importer) {
      if (id === './converter/template.js' || id.endsWith('/converter/template.js')) {
        return STUB_ID
      }
    },
    load (id) {
      if (id === STUB_ID) {
        return 'export class TemplateConverter { static async create() { throw new Error("TemplateConverter is not supported in browser environments") } }'
      }
    },
  }
}

// Replaces the Node-only highlightjs build engine with a stub that reports build
// mode as unsupported, so the browser bundle never carries the highlight.js
// loading / filesystem code. The highlightjs adapter then falls back to
// client-side highlighting (and warns) when :highlightjs-mode: build is set.
function browserHighlightjsBuildStub () {
  const STUB_ID = '\0browser:highlightjs-build'
  return {
    name: 'browser-highlightjs-build-stub',
    resolveId (id) {
      if (id === './highlightjs-build.js' || id.endsWith('/syntaxHighlighter/highlightjs-build.js')) {
        return STUB_ID
      }
    },
    load (id) {
      if (id === STUB_ID) {
        return 'export const buildEngine = { supported: false }'
      }
    },
  }
}

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: 'src/index.js',
    output: {
      file: 'build/node/index.cjs',
      format: 'cjs',
      exports: 'named',
      inlineDynamicImports: true,
      generatedCode: { constBindings: true },
    },
    external: (id) => id.startsWith('node:'),
    plugins: [
      nodeAwaitImportToRequire(),
      json(),
    ],
  },
  {
    input: 'src/browser.js',
    output: {
      file: 'build/browser/index.js',
      format: 'esm',
      inlineDynamicImports: true,
      generatedCode: { constBindings: true },
    },
    external: (id) => id.startsWith('node:'),
    plugins: [
      browserTemplateConverterStub(),
      browserHighlightjsBuildStub(),
      json(),
    ],
  },
]