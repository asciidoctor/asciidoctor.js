#!/usr/bin/env node
import { Options, Invoker } from '../../lib/cli.js'

class ExtendedOptions extends Options {
  constructor() {
    super()
    this.addOption('custom-flag', { type: 'boolean', short: 'F', describe: 'a custom flag' })
    this.addOption('theme', { type: 'string', describe: 'PDF theme name', metavar: '<theme>' })
  }
}

class ExtendedInvoker extends Invoker {
  version() {
    return `Extended CLI using ${super.version()}`
  }

  async convertFiles(files, options, values) {
    console.log(`extended:${files.join(',')}:custom-flag=${values['custom-flag'] ?? false}:theme=${values.theme ?? ''}`)
  }
}

await new ExtendedInvoker(new ExtendedOptions().parse(process.argv)).invoke()