const handlebars = require('handlebars')
handlebars.registerHelper('content', function (node) {
  return node.getContent()
})
