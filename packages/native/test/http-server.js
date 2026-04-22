import { createServer } from 'node:http'

/**
 * Start an HTTP server with static routes.
 *
 * @param {Map<string, { contentType: string, body: string|Buffer }>} routes
 * @returns {Promise<{ server: import('node:http').Server, baseUri: string }>}
 */
export function startServer (routes) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const route = routes.get(req.url)
      if (route) {
        res.writeHead(200, { 'Content-Type': route.contentType })
        res.end(route.body)
      } else {
        res.writeHead(404)
        res.end('Not Found')
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, baseUri: `http://127.0.0.1:${port}` })
    })
  })
}