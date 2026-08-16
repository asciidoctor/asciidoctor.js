// Regression test for `Document` JSDoc references resolving to the ambient
// DOM `Document` (lib.dom.d.ts) instead of Asciidoctor's own `Document`
// class (document.js).
//
// The bug: a source file uses a bare `{Document}` JSDoc type without
// importing `Document` from './document.js'. `test/types/tsconfig.json`
// has no "dom" lib, so under this config a bare, unresolved `Document`
// does not silently become the DOM type — `skipLibCheck` instead lets it
// through as an unchecked `any` in the generated .d.ts. Either way the
// effect is the same: type checking on that parameter/return is defeated.
//
// Assigning a wrong-typed value (e.g. a number) directly wouldn't catch
// this, since `any` accepts anything just like a correctly-typed
// assignment would be rejected only when the type is truly `Document`.
// So each check below extracts the declared parameter/return type via
// `Parameters<>`/return-type utilities and asserts, under `@ts-expect-error`,
// that a number is NOT assignable to it. If the type has regressed to
// `any`, the assignment silently succeeds, the `@ts-expect-error` goes
// unused, and `tsc` fails with "Unused '@ts-expect-error' directive" —
// turning the silent regression into a compile failure.
//
// These are compile-only checks: `npm run test:types` runs `tsc --noEmit`
// against this file using the generated declarations in ../../types.

import type {
  AbstractNode,
  DocinfoProcessor,
  IncludeProcessor,
  Postprocessor,
  Preprocessor,
  Registry,
  SyntaxHighlighterBase,
  TreeProcessor,
} from '../../types/index.js'

// ── AbstractNode#getDocument() ─────────────────────────────────────────────
type NodeGetDocumentReturn = ReturnType<AbstractNode['getDocument']>
// @ts-expect-error a number is not assignable to Asciidoctor's Document
const _abstractNodeDoc: NodeGetDocumentReturn = 42
void _abstractNodeDoc

// ── Preprocessor#process(document, reader) ─────────────────────────────────
type PreprocessorDocumentParam = Parameters<Preprocessor['process']>[0]
// @ts-expect-error a number is not assignable to Asciidoctor's Document
const _preprocessorDoc: PreprocessorDocumentParam = 42
void _preprocessorDoc

// ── TreeProcessor#process(document) ─────────────────────────────────────────
type TreeProcessorDocumentParam = Parameters<TreeProcessor['process']>[0]
// @ts-expect-error a number is not assignable to Asciidoctor's Document
const _treeProcessorDoc: TreeProcessorDocumentParam = 42
void _treeProcessorDoc

// ── Postprocessor#process(document, output) ─────────────────────────────────
type PostprocessorDocumentParam = Parameters<Postprocessor['process']>[0]
// @ts-expect-error a number is not assignable to Asciidoctor's Document
const _postprocessorDoc: PostprocessorDocumentParam = 42
void _postprocessorDoc

// ── IncludeProcessor#process(document, …) / #handles(doc, target) ──────────
type IncludeProcessorDocumentParam = Parameters<IncludeProcessor['process']>[0]
// @ts-expect-error a number is not assignable to Asciidoctor's Document
const _includeProcessorDoc: IncludeProcessorDocumentParam = 42
void _includeProcessorDoc

type IncludeProcessorHandlesDocParam = Parameters<
  IncludeProcessor['handles']
>[0]
// `handles` accepts `Document | string`, so only a number (neither) proves the
// Document half of the union survived — a string would pass either way.
// @ts-expect-error a number is neither Asciidoctor's Document nor a string
const _includeProcessorHandlesDoc: IncludeProcessorHandlesDocParam = 42
void _includeProcessorHandlesDoc

// ── DocinfoProcessor#process(document) ───────────────────────────────────────
type DocinfoProcessorDocumentParam = Parameters<DocinfoProcessor['process']>[0]
// @ts-expect-error a number is not assignable to Asciidoctor's Document
const _docinfoProcessorDoc: DocinfoProcessorDocumentParam = 42
void _docinfoProcessorDoc

// ── Registry#activate(document) ───────────────────────────────────────────────
type RegistryActivateParam = Parameters<Registry['activate']>[0]
// @ts-expect-error a number is not assignable to Asciidoctor's Document
const _registryActivateDoc: RegistryActivateParam = 42
void _registryActivateDoc

// ── SyntaxHighlighterBase#docinfo/writeStylesheet/writeStylesheetToDisk ─────
type DocinfoDocParam = Parameters<SyntaxHighlighterBase['docinfo']>[1]
// @ts-expect-error a number is not assignable to Asciidoctor's Document
const _highlighterDocinfoDoc: DocinfoDocParam = 42
void _highlighterDocinfoDoc

type WriteStylesheetDocParam = Parameters<
  SyntaxHighlighterBase['writeStylesheet']
>[0]
// @ts-expect-error a number is not assignable to Asciidoctor's Document
const _highlighterWriteStylesheetDoc: WriteStylesheetDocParam = 42
void _highlighterWriteStylesheetDoc

type WriteStylesheetToDiskDocParam = Parameters<
  SyntaxHighlighterBase['writeStylesheetToDisk']
>[0]
// @ts-expect-error a number is not assignable to Asciidoctor's Document
const _highlighterWriteStylesheetToDiskDoc: WriteStylesheetToDiskDocParam = 42
void _highlighterWriteStylesheetToDiskDoc
