// ESM helpers exposed as named exports (no default export): the loader must
// fall back to the module namespace so `helpers.greeting()` resolves.
export function greeting() {
  return 'esm-helper'
}