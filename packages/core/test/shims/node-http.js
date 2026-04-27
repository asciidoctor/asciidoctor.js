export function createServer () {
  throw new Error('node:http createServer() is not supported in browser environments')
}
export default { createServer }