// Port of test/semantic_html5_converter_test.rb (upstream feature/html-converter-next branch).
//
// Scenario-based: every <name>.adoc file in test/fixtures/semantic-html5-scenarios/
// is converted with the 'semantic-html5' backend (embedded) and compared against
// the expected output in the sibling <name>.html file.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { convertStringToEmbedded } from './harness.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scenariosDir = join(__dirname, 'fixtures', 'semantic-html5-scenarios')

describe('Semantic HTML 5 converter', () => {
  const scenarios = readdirSync(scenariosDir)
    .filter((name) => name.endsWith('.adoc'))
    .map((name) => name.slice(0, -5))
    .sort()

  for (const scenario of scenarios) {
    test(scenario, async () => {
      const input = readFileSync(join(scenariosDir, `${scenario}.adoc`), 'utf8')
      const expected = readFileSync(
        join(scenariosDir, `${scenario}.html`),
        'utf8'
      ).replace(/\n$/, '')
      const result = await convertStringToEmbedded(input, {
        backend: 'semantic-html5',
      })
      assert.equal(result.replace(/\n$/, ''), expected)
    })
  }
})
