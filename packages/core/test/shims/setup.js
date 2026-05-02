// Minimal Buffer polyfill for browser tests.
// Uses TextEncoder for byte-accurate UTF-8 length calculation.
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = class Buffer {
    static byteLength(str, encoding = 'utf8') {
      return new TextEncoder().encode(str).length
    }

    static from(data, encoding) {
      if (typeof data === 'string') {
        const encoded = new TextEncoder().encode(data)
        return Object.assign(encoded, { toString: () => data })
      }
      return new Uint8Array(data)
    }

    static isBuffer(obj) {
      return obj instanceof Buffer
    }
    static concat(bufs) {
      return new Uint8Array(bufs.flatMap((b) => Array.from(b)))
    }

    static alloc(size, fill = 0) {
      const buf = new Uint8Array(size)
      if (fill) buf.fill(fill)
      return buf
    }
  }
}
