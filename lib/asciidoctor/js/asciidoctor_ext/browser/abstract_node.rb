module Asciidoctor
class AbstractNode
  def read_contents target, opts = {}
    doc = @document
    if (Helpers.uriish? target) || ((start = opts[:start]) && (Helpers.uriish? start) && (target = doc.path_resolver.web_path target, start))
      if (doc.path_resolver.descends_from? target, doc.base_dir) || (doc.attr? 'allow-uri-read')
        begin
          if opts[:normalize]
            (Helpers.prepare_source_string ::File.read(target).join LF)
          else
            ::File.read(target)
          end
        rescue
          logger.warn %(could not retrieve contents of #{opts[:label] || 'asset'} at URI: #{target}) if opts.fetch :warn_on_failure, true
          return
        end
      else
        logger.warn %(cannot retrieve contents of #{opts[:label] || 'asset'} at URI: #{target} (allow-uri-read attribute not enabled)) if opts.fetch :warn_on_failure, true
        return
      end
    else
      target = normalize_system_path target, opts[:start], nil, target_name: (opts[:label] || 'asset')
      read_asset target, normalize: opts[:normalize], warn_on_failure: (opts.fetch :warn_on_failure, true), label: opts[:label]
    end
  end

  def generate_data_uri_from_uri image_uri, cache_uri = false
    %x{
      var contentType = ''
      var b64encoded = ''
      var status = -1

      try {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', #{image_uri}, false)
        // the response type cannot be changed for synchronous requests made from a document
        // xhr.responseType = 'arraybuffer'
        xhr.overrideMimeType('text/plain; charset=x-user-defined')
        xhr.addEventListener('load', function() {
          status = this.status
          // status is 0 for local file mode (i.e., file://)
          if (status === 0 || status === 200) {
            var binary = ''
            var rawText = this.responseText
            for (var i = 0, len = rawText.length; i < len; ++i) {
              var c = rawText.charCodeAt(i)
              var byteCode = c & 0xff // byte at offset i
              binary += String.fromCharCode(byteCode)
            }
            b64encoded = btoa(binary)
            contentType = this.getResponseHeader('content-type')
          }
        })
        xhr.send(null)
        // try to detect the MIME Type from the file extension
        if (!contentType) {
          if (#{image_uri}.endsWith('.jpeg') || #{image_uri}.endsWith('.jpg') || #{image_uri}.endsWith('.jpe')) {
            contentType = 'image/jpg'
          } else if (#{image_uri}.endsWith('.png')) {
            contentType = 'image/png'
          } else if (#{image_uri}.endsWith('.svg')) {
            contentType = 'image/svg+xml'
          } else if (#{image_uri}.endsWith('.bmp')) {
            contentType = 'image/bmp'
          } else if (#{image_uri}.endsWith('.tif') || #{image_uri}.endsWith('.tiff')) {
            contentType = 'image/tiff'
          }
        }
      }
      catch (e) {
        // something bad happened!
        status = 0
      }

      // assume that no data in local file mode means it doesn't exist
      if (status === 404 || (status === 0 && (!b64encoded || !contentType))) {
        self.$logger().$warn('could not retrieve image data from URI: ' + #{image_uri})
        return #{image_uri}
      }
      return 'data:' + contentType + ';base64,' + b64encoded
    }
  end
end
end
