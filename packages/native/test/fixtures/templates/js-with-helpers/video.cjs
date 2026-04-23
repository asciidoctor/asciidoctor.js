module.exports = function ({ node, _, helpers }) {
  const rew = node.isOption('rewind') ? 'true' : undefined
  const vol = node.isOption('muted') ? 0 : node.getAttribute('volume')
  const target = helpers.getLocalAttribute(node, 'target')
  const params = ['enablejsapi=1', 'rel=0', 'showinfo=0', 'controls=0', 'disablekb=1']
  if (helpers.getLocalAttribute(node, 'start')) {
    params.push(`start=${helpers.getLocalAttribute(node, 'start')}`)
  }
  if (helpers.getLocalAttribute(node, 'end')) {
    params.push(`start=${helpers.getLocalAttribute(node, 'end')}`)
  }
  if (node.isOption('loop')) {
    params.push('loop=1')
    params.push(`playlist=${target}`)
  }
  if (node.isOption('nofullscreen')) {
    params.push('fs=0')
  }
  const document = node.getDocument()
  if (document.getAttribute('lang')) {
    params.push(`hl=${document.getAttribute('lang')}`)
  }
  const src = `${helpers.getAssetUriScheme(document)}//www.youtube.com/embed/${target}?${params.join('&amp;')}`
  return `<figure class="video ${node.getRole()}"${node.getId() ? ` id="${node.getId()}"` : ''}>
  <iframe src="${src}" width="${helpers.getLocalAttribute(node, 'width')}" height="${helpers.getLocalAttribute(node, 'height')}" frameborder="0" allowfullscreen="${node.isOption('nofullscreen') ? '' : 'true'}" data-rewind="${rew || ''}" data-volume="${vol || ''}"/>
</figure>`
}
