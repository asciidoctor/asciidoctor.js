import { expect } from 'vitest'

function equal (actual, expected, message) { expect(actual, message).toBe(expected) }
function deepEqual (actual, expected, message) { expect(actual, message).toEqual(expected) }
function strictEqual (actual, expected, message) { expect(actual, message).toBe(expected) }
function deepStrictEqual (actual, expected, message) { expect(actual, message).toStrictEqual(expected) }
function notEqual (actual, expected, message) { expect(actual, message).not.toBe(expected) }
function notDeepStrictEqual (actual, expected, message) { expect(actual, message).not.toStrictEqual(expected) }
function ok (value, message) { expect(value, message).toBeTruthy() }
function fail (message) { throw new Error(message || 'Assertion failed') }
function match (actual, pattern, message) { expect(actual, message).toMatch(pattern) }
function doesNotMatch (actual, pattern, message) { expect(actual, message).not.toMatch(pattern) }
function throws (fn, errorOrMessage, message) { expect(fn).toThrow() }
async function rejects (fnOrPromise, errorOrMessage, message) {
  const p = typeof fnOrPromise === 'function' ? fnOrPromise() : fnOrPromise
  await expect(p).rejects.toThrow()
}

const assert = {
  equal, deepEqual, strictEqual, deepStrictEqual,
  notEqual, notDeepStrictEqual,
  ok, fail, match, doesNotMatch, throws, rejects,
}

export {
  equal, deepEqual, strictEqual, deepStrictEqual,
  notEqual, notDeepStrictEqual,
  ok, fail, match, doesNotMatch, throws, rejects,
}
export default assert