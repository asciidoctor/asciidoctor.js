# packages/core

## Overview

This package is a **native JavaScript implementation of Asciidoctor**, converted from the original [Ruby source](https://github.com/asciidoctor/asciidoctor) by Claude. It is a pure ESM library targeting Node.js ≥ 24 with no Opal/Ruby compilation step.

This `@asciidoctor/core` package replaces the previous version that relied on Opal (a Ruby-to-JavaScript transpiler) to produce a JS bundle. It is now implemented with handwritten/AI-translated JavaScript modules that follow the same public API.

## Architecture

Each source file corresponds to a Ruby file in the upstream Asciidoctor repository and carries a header comment documenting the Ruby-to-JavaScript translation decisions made for that module.

| File | Ruby source | Role |
|------|-------------|------|
| `src/load.js` | `load.rb` | Public `load()` / `loadFile()` entry points |
| `src/document.js` | `document.rb` | `Document` class — root of the parsed AST |
| `src/abstract_node.js` | `abstract_node.rb` | Base class for all AST nodes |
| `src/abstract_block.js` | `abstract_block.rb` | Block-level node base class |
| `src/block.js` | `block.rb` | Generic block node |
| `src/section.js` | `section.rb` | Section/heading node |
| `src/inline.js` | `inline.rb` | Inline node |
| `src/list.js` | `list.rb` | List and ListItem nodes |
| `src/table.js` | `table.rb` | Table, Row, Cell nodes |
| `src/callouts.js` | `callouts.rb` | Callout tracking |
| `src/parser.js` | `parser.rb` | Main AsciiDoc parser (all methods are `static` on `Parser`) |
| `src/reader.js` | `reader.rb` | Line-by-line source reader |
| `src/substitutors.js` | `substitutors.rb` | Text substitution pipeline |
| `src/attribute_list.js` | `attribute_list.rb` | Block attribute list parser |
| `src/converter.js` | `converter.rb` | Converter registry and base class |
| `src/converter/html5.js` | `converter/html5.rb` | Built-in HTML5 converter |
| `src/extensions.js` | `extensions.rb` | Extension API (preprocessors, block/inline macros, …) |
| `src/syntax_highlighter.js` | `syntax_highlighter.rb` | Syntax highlighter base/registry |
| `src/syntaxHighlighter/highlightjs.js` | — | Highlight.js adapter |
| `src/path_resolver.js` | `path_resolver.rb` | Path resolution helpers |
| `src/logging.js` | `logging.rb` | Logger / LoggerManager |
| `src/compliance.js` | `compliance.rb` | Compliance flags |
| `src/helpers.js` | `helpers.rb` | Shared utility functions |
| `src/constants.js` | `constants.rb` | Shared constants (SafeMode, DEFAULT_ATTRIBUTES, …) |
| `src/rx.js` | — | Centralised regular expressions |
| `src/timings.js` | `timings.rb` | Performance timings |
| `src/index.js` | — | Package entry point (re-exports public API) |

## Key translation patterns

When converting or extending code, follow the conventions established in the existing files:

- **Ruby module methods → named exports** (e.g. `Asciidoctor.load` → `export function load`).
- **Ruby mixins / `include`** → plain objects applied with `Object.assign(instance, mixin)` or helper functions like `applyLogging()`.
- **Ruby class methods (`def self.foo`)** → `static foo()` on the JS class.
- **Ruby symbols (`:key`)** → plain strings (`'key'`), including config option keys which keep `snake_case`.
- **Ruby predicates (`attr?`, `title?`)** → `hasAttr()`, `hasTitle()`, etc.
- **Ruby `nil` / `.nil_or_empty?`** → `null` / `!val` or explicit `== null || === ''` checks.
- **Ruby `.to_i`** → `parseInt(val, 10)` (returns `0` for `null`/non-numeric).
- **Ruby `$1`, `$2` captures** → JS match array `m[1]`, `m[2]`.
- **Thread safety / Mutex** → not needed (single-threaded JS).
- **Circular dependencies** → resolved via lazy `import()` inside functions; pre-warmed in `load.js` using `Promise.all`.
- **`node:path`, `node:fs`** → imported lazily (`_requirePath()`) to avoid issues in non-Node environments.

## Generated type declarations

The files under `types/` are **generated** — do not edit them by hand. To regenerate after modifying `src/`:

```
npm run build:types
```

This runs `tsc` (emits `.d.ts` from the JSDoc-annotated JS sources), then `scripts/strip-internal.js` (removes `@internal` declarations) and `scripts/patch-jsdoc.js` (restores JSDoc on namespace variables).

If TypeDoc warns that a type is referenced but not included in the documentation, add it as an import and re-export in `src/index.js`, then rebuild.

## Linting

The project uses [Biome](https://biomejs.dev/) for linting and formatting.

**Always run after any code change:**

```
npm run format   # format src/ and test/
npm run check    # lint + format check src/ and test/
```

The Biome config is in `biome.json` (package-level) and the root `biome.json`. The `test/fixtures/` directory is excluded via `files.includes`.

## Running tests

```
npm test                              # all packages (from repo root)
npm test -w @asciidoctor/core         # core package only
npm run test:browser -w @asciidoctor/core  # browser tests (Vitest + Playwright)
npm run test:coverage -w @asciidoctor/core # with coverage report
```

Tests use the Node.js built-in test runner (`node:test` / `node:assert/strict`). No additional test framework is required.

Test files live in `test/` and are named `*.test.js`. Fixtures (sample `.adoc` files) live in `test/fixtures/`.

## Adding a new source file

1. Create `src/<name>.js` mirroring the structure of an existing file.
2. Add a `// ESM conversion of <name>.rb` header with Ruby-to-JavaScript notes.
3. Use only ES module syntax (`import`/`export`); no CommonJS.
4. Re-export any public symbols from `src/index.js` if they should be part of the package API.
5. Add tests in `test/<name>.test.js`.