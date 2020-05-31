module.exports.configure = (ctx) => {
  // mixed template engines!
  ctx.handlebars.environment.registerHelper('content', (node) => new ctx.handlebars.environment.SafeString(node.getContent()))
  ctx.nunjucks.environment.addFilter('cdn', function (str) {
    return `https://cdn.jsdelivr.net/${str}`
  })
}
