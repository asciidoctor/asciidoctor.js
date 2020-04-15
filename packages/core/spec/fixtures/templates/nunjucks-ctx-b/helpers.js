module.exports.configure = (ctx) => {
  if (ctx.nunjucks && ctx.nunjucks.environment) {
    const env = ctx.nunjucks.environment
    env.addFilter('cdn', function (str) {
      return `https://cdn.statically.io/${str}`
    })
  }
}
