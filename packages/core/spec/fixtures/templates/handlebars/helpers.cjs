module.exports.configure = (context) => {
  context.handlebars.environment.registerHelper('content', (node) => node.getContent())
}
