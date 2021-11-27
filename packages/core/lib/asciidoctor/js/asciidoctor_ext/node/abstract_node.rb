module Asciidoctor
class AbstractNode
  def generate_data_uri_from_uri image_uri, cache_uri = false
    %x{
      var contentType = ''
      var b64encoded = ''
      var status = -1

      try {
        var xhr = new __XMLHttpRequest__();
        xhr.open('GET', image_uri, false);
        xhr.responseType = 'arraybuffer';
        xhr.addEventListener('load', function() {
          status = this.status
          if (status === 200) {
            var arrayBuffer = this.response;
            b64encoded = Buffer.from(arrayBuffer).toString('base64');
            contentType = this.getResponseHeader('content-type')
          }
        })
        xhr.send(null)
      }
      catch (e) {
        // something bad happened!
        status = 0
      }
      if (status === 404 || (status === 0 && !b64encoded)) {
        self.$logger().$warn('could not retrieve image data from URI: ' + #{image_uri})
        return #{image_uri}
      }
      return 'data:' + contentType + ';base64,' + b64encoded
    }
  end
end
end
