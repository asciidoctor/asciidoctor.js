let assetUriScheme
module.exports = {
  getAssetUriScheme (document) {
    if (assetUriScheme) {
      return assetUriScheme
    }
    const scheme = document.getAttribute('asset-uri-scheme', 'https')
    if (scheme && scheme.trim() !== '') {
      assetUriScheme = `${scheme}:`
    } else {
      assetUriScheme = ''
    }
    return assetUriScheme
  },
  getLocalAttribute (node, name, defaultValue) {
    return node.getAttribute(name, defaultValue, false)
  }
}
