import path from 'path'
import fs from 'fs'
import process from 'process'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const isWin = process.platform === 'win32'

export function fileExists (path) {
  try {
    fs.statSync(path)
    return true
  } catch (err) {
    return !(err && err.code === 'ENOENT')
  }
}

export function removeFile (path) {
  if (fileExists(path)) {
    fs.unlinkSync(path)
  }
}

export function truncateFile (path) {
  try {
    fs.truncateSync(path, 0) // file must be empty
  } catch (err) {
    if (err.code === 'ENOENT') {
      // it's OK, if the file does not exists
    }
  }
}

export const resolveFixture = (name) => {
  return path.resolve(path.join(__dirname, '..', 'fixtures', name))
}
