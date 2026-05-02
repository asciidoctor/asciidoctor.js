function notSupported(name) {
  return () => {
    throw new Error(
      `node:fs ${name}() is not supported in browser environments`
    )
  }
}

export const readFileSync = notSupported('readFileSync')
export const writeFileSync = notSupported('writeFileSync')
export const copyFileSync = notSupported('copyFileSync')
export const unlinkSync = notSupported('unlinkSync')
export const mkdtempSync = notSupported('mkdtempSync')
export const mkdirSync = notSupported('mkdirSync')
export const rmSync = notSupported('rmSync')
export const existsSync = notSupported('existsSync')
export const statSync = notSupported('statSync')
export const readdirSync = notSupported('readdirSync')
export const constants = { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 }

const fs = {
  readFileSync,
  writeFileSync,
  copyFileSync,
  unlinkSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  existsSync,
  statSync,
  readdirSync,
  constants,
}
export default fs
