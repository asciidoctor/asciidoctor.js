export default function (registry) {
  registry.docinfoProcessor(function () {
    this.atLocation('head')
    this.process(function (doc) {
      const title = doc.getDocumentTitle()
      const description = doc.getAttribute('description', '')
      const image = doc.getAttribute('og-image', '')
      const tags = [`<meta property="og:title" content="${title}">`]
      if (description) tags.push(`<meta property="og:description" content="${description}">`)
      if (image) tags.push(`<meta property="og:image" content="${image}">`)
      return tags.join('\n')
    })
  })
}