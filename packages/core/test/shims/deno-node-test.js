// Deno shim for node:test — uses @std/testing/bdd to provide working beforeEach/afterEach.
// Loaded via the import map in deno.json: "node:test" → this file.
import {
  describe as bddDescribe,
  it as bddIt,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'jsr:@std/testing/bdd'

// Disable Deno's resource/op sanitizers — node:test doesn't have them.
const denoCompat = {
  sanitizeOps: false,
  sanitizeResources: false,
  sanitizeExit: false,
}

// node:test allows describe(name, options, fn); ignore options (e.g. { concurrency: false })
export function describe(name, optsOrFn, fn) {
  if (typeof optsOrFn === 'function')
    return bddDescribe(name, denoCompat, optsOrFn)
  return bddDescribe(name, denoCompat, fn)
}

// Wrap test functions to expose a minimal node:test-compatible context (t.skip / t.todo).
function wrapFn(fn) {
  return (t) => {
    const ctx = Object.assign(Object.create(t ?? {}), {
      skip: () => undefined,
      todo: () => undefined,
    })
    return fn(ctx)
  }
}

export function it(name, fn) {
  return bddIt(name, wrapFn(fn))
}

export const test = it
export const before = beforeAll
export const after = afterAll
export { beforeEach, afterEach }
