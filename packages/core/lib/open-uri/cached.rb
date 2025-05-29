# copied from https://github.com/tigris/open-uri-cached/blob/master/lib/open-uri/cached.rb
module OpenURI
  class << self
    # preserve the original open_uri method
    alias original_open_uri open_uri
    def cache_open_uri(uri, *rest, &block)
      response = Cache.get(uri.to_s) ||
                 Cache.set(uri.to_s, original_open_uri(uri, *rest))

      if block_given?
        begin
          yield response
        ensure
          response.close
        end
      else
        response
      end
    end
    # replace the existing open_uri method
    alias open_uri cache_open_uri
  end

  class Cache
    class << self

      %x{
        // largely inspired by https://github.com/isaacs/node-lru-cache/blob/master/index.js
        let cache = new Map()
        let max = 16000000 // bytes
        let length = 0
        let lruList = []

        class Entry {
          constructor (key, value, length) {
            this.key = key
            this.value = value
            this.length = length
          }
        }

        const trim = () => {
          while (length > max) {
            pop()
          }
        }

        const clear = () => {
          cache = new Map()
          length = 0
          lruList = []
        }

        const pop = () => {
          const leastRecentEntry = lruList.pop()
          if (leastRecentEntry) {
            length -= leastRecentEntry.length
            cache.delete(leastRecentEntry.key)
          }
        }

        const del = (entry) => {
          if (entry) {
            length -= entry.length
            cache.delete(entry.key)
            const entryIndex = lruList.indexOf(entry)
            if (entryIndex > -1) {
              lruList.splice(entryIndex, 1)
            }
          }
        }
      }

      ##
      # Retrieve file content and meta data from cache
      # @param [String] key
      # @return [StringIO]
      def get(key)
        %x{
          const cacheKey = crypto.createHash('sha256').update(key).digest('hex')
          if (cache.has(cacheKey)) {
            const entry = cache.get(cacheKey)
            const io = Opal.$$$('::', 'StringIO').$new()
            io['$<<'](entry.value)
            io.$rewind()
            return io
          }
        }

        nil
      end

      # Cache file content
      # @param [String] key
      #   URL of content to be cached
      # @param [StringIO] value
      #   value to be cached, typically StringIO returned from `original_open_uri`
      # @return [StringIO]
      #   Returns value
      def set(key, value)
        %x{
          const cacheKey = crypto.createHash('sha256').update(key).digest('hex')
          const contents = value.string
          const len = contents.length
          if (cache.has(cacheKey)) {
            if (len > max) {
              // oversized object, dispose the current entry.
              del(cache.get(cacheKey))
              return value
            }
            // update current entry
            const entry = cache.get(cacheKey)
            // remove existing entry in the LRU list (unless the entry is already the head).
            const listIndex = lruList.indexOf(entry)
            if (listIndex > 0) {
              lruList.splice(listIndex, 1)
              lruList.unshift(entry)
            }
            entry.value = value
            length += len - entry.length
            entry.length = len
            trim()
            return value
          }

          const entry = new Entry(cacheKey, value, len)
          // oversized objects fall out of cache automatically.
          if (entry.length > max) {
            return value
          }

          length += entry.length
          lruList.unshift(entry)
          cache.set(cacheKey, entry)
          trim()
          return value
        }
      end

      def max=(maxLength)
        %x{
          if (typeof maxLength !== 'number' || maxLength < 0) {
            throw new TypeError('max must be a non-negative number')
          }

          max = maxLength || Infinity
          trim()
        }
      end

      def clear
        `clear()`
      end
    end
  end
end
