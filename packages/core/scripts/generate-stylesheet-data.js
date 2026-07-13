#!/usr/bin/env node
// Reads the stylesheets in data/ and writes the embedded JS modules in src/data/.
// Run via: npm run build:data

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = join(root, 'src', 'data')
mkdirSync(outDir, { recursive: true })

const stylesheets = [
  ['asciidoctor-default.css', 'stylesheet-data.js'],
  ['asciidoctor-semantic.css', 'semantic-stylesheet-data.js'],
]

for (const [cssFile, outFile] of stylesheets) {
  const css = readFileSync(join(root, 'data', cssFile), 'utf8').trimEnd()
  const outPath = join(outDir, outFile)
  writeFileSync(
    outPath,
    `// Auto-generated from data/${cssFile} — run 'npm run build:data' to update\nexport default ${JSON.stringify(css)}\n`
  )
  console.log(`generated ${outPath} (${css.length} chars)`)
}
