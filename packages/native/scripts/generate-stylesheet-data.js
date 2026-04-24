#!/usr/bin/env node
// Reads data/asciidoctor-default.css and writes src/data/stylesheet-data.js.
// Run via: npm run build:data

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const cssPath = join(root, 'data', 'asciidoctor-default.css')
const outDir = join(root, 'src', 'data')
const outPath = join(outDir, 'stylesheet-data.js')

const css = readFileSync(cssPath, 'utf8').trimEnd()

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, `// Auto-generated from data/asciidoctor-default.css — run 'npm run build:data' to update\nexport default ${JSON.stringify(css)}\n`)

console.log(`generated ${outPath} (${css.length} chars)`)