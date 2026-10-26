module.exports.configure = async (ctx) => {
  // simulate an asynchronous setup (e.g., loading a configuration file)
  await new Promise((resolve) => setTimeout(resolve, 10))
  ctx.nunjucks.environment.addFilter('shout', (str) => `${str}!`)
}
