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

/** @type {import('rollup').RollupOptions} */
export default {
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
}