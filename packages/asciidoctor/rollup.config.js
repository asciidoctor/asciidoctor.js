import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'

const BUNDLED_ENGINES = ['ejs', 'handlebars', 'nunjucks', 'pug']

// Converts `await import('node:X')` → `require('node:X')` so that
// top-level await (used for optional Node.js module loading) is
// compatible with CJS output format. Mirrors the same plugin used
// in @asciidoctor/core's own rollup build.
function nodeAwaitImportToRequire() {
  return {
    name: 'node-await-import-to-require',
    transform(code) {
      if (!code.includes("await import('node:")) return null
      return {
        code: code.replaceAll(
          /await import\('(node:[^']+)'\)/g,
          "require('$1')"
        ),
        map: null,
      }
    },
  }
}

function transformCli() {
  return {
    name: 'transform-cli',
    transform(code, id) {
      if (!id.endsWith('/lib/cli.js')) return null

      // Remove createRequire — CJS output has native require
      code = code.replace("import { createRequire } from 'node:module'\n", '')
      code = code.replace(
        'const require = createRequire(import.meta.url)\n\n',
        '\n'
      )

      // import.meta.dirname → __dirname (CJS equivalent)
      code = code.replaceAll('import.meta.dirname', '__dirname')

      // Wrap file reads to use SEA embedded assets when running as a standalone binary
      code = code.replace(
        "readFileSync(join(__dirname, '..', 'package.json'), 'utf8')",
        "_seaRead('package.json') ?? readFileSync(join(__dirname, '..', 'package.json'), 'utf8')"
      )
      code = code.replace(
        "readFileSync(join(__dirname, '..', 'data', 'reference', 'syntax.adoc'), 'utf8')",
        "_seaRead('syntax.adoc') ?? readFileSync(join(__dirname, '..', 'data', 'reference', 'syntax.adoc'), 'utf8')"
      )

      return { code, map: null }
    },
  }
}

// Patches @asciidoctor/core's TemplateConverter so that _require('ejs') etc.
// resolve to the statically bundled engine modules instead of Node's runtime
// module resolution (which would fail inside a SEA binary).
function bundleTemplateEngines() {
  const engineImports = BUNDLED_ENGINES.map(
    (e) => `import _bundled_${e} from '${e}';`
  ).join('\n')
  const engineMap = BUNDLED_ENGINES.map((e) => `'${e}': _bundled_${e}`).join(
    ', '
  )

  return {
    name: 'bundle-template-engines',
    transform(code, id) {
      if (!id.endsWith('/converter/template.js')) return null

      // Replace the _require definition with a wrapper that checks the bundled
      // engine map first, then falls back to Node's require for user helpers and
      // custom TemplateEngine adapters loaded from the filesystem.
      code = code.replace(
        'const _require = createRequire(import.meta.url)',
        `const _engineCache = { ${engineMap} }
const _rawCjsRequire = createRequire(import.meta.url)
const _require = (id) => (_engineCache[id] ?? _rawCjsRequire(id))`
      )

      return { code: `${engineImports}\n${code}`, map: null }
    },
  }
}

export default {
  input: 'lib/cli.js',
  output: {
    file: 'dist/cli.cjs',
    format: 'cjs',
    exports: 'named',
    inlineDynamicImports: true,
    generatedCode: { constBindings: true },
    // Injected at the top of the CJS module body; require() is available there.
    intro: `function _seaRead(key) {
  try { const sea = require('node:sea'); if (sea.isSea()) return sea.getAsset(key, 'utf8') } catch (_) {}
  return null
}`,
    footer: `if (require.main === module) { exports.run().catch((e) => { console.error(e); process.exit(1) }) }`,
  },
  external: (id) => id.startsWith('node:'),
  plugins: [
    transformCli(),
    bundleTemplateEngines(),
    nodeAwaitImportToRequire(),
    nodeResolve(),
    commonjs(),
    json(),
  ],
}
