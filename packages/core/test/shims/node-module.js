import pkg from '../../package.json' with { type: 'json' }

export function createRequire(url) {
  return function require(id) {
    // Return the local package.json for relative requires
    if (id.endsWith('package.json')) return pkg
    throw new Error(`require('${id}') is not supported in browser environments`)
  }
}
