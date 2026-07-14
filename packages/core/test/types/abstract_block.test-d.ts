// Type-level tests for AbstractBlock#findBy and its `query` alias.
//
// These are compile-only checks: `npm run test:types` runs `tsc --noEmit`
// against this file using the generated declarations in ../../types.
// A regression in the JSDoc typings makes this file fail to compile.

import { type AbstractBlock, type Document, load } from '../../types/index.js'

const doc: Document = await load('= Title')

// ── findBy(selector): returns AbstractBlock[] ─────────────────────────────────
const listings: AbstractBlock[] = doc.findBy({
  context: 'listing',
  style: 'source',
})
void listings

// ── findBy(selector, filter): the callback receives an AbstractBlock ──────────
doc.findBy({ context: 'section' }, (block) => {
  return (block.getLevel() ?? 0) <= 2 || 'prune'
})

// ── findBy(callback) shorthand: the callback receives an AbstractBlock ────────
doc.findBy((block) => {
  return block.hasTitle()
})

// ── query alias mirrors findBy ─────────────────────────────────────────────────
const queried: AbstractBlock[] = doc.query((block) => {
  return block.getContext() === 'image'
})
void queried
