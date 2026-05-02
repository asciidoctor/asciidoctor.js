import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default function (registry) {
  registry.includeProcessor(function () {
    this.handles((target) => target.endsWith('.txt'))
    this.process(async function (doc, reader, target, attrs) {
      const content = await readFile(join(doc.getBaseDir(), target), 'utf8')
      return reader.pushInclude(
        content.trimEnd().split('\n'),
        target,
        target,
        1,
        attrs
      )
    })
  })
}
