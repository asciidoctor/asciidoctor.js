function notSupported(name) {
  return async function () {
    throw new Error(
      `node:fs/promises ${name}() is not supported in browser environments`
    )
  }
}

export const readFile = notSupported('readFile')
export const writeFile = notSupported('writeFile')
export const stat = notSupported('stat')
export const readdir = notSupported('readdir')
export const mkdir = notSupported('mkdir')
export const access = notSupported('access')
export const unlink = notSupported('unlink')
export const rm = notSupported('rm')
export const mkdtemp = notSupported('mkdtemp')

const promises = {
  readFile,
  writeFile,
  stat,
  readdir,
  mkdir,
  access,
  unlink,
  rm,
  mkdtemp,
}
export { promises }
export default promises
