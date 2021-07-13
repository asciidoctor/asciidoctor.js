const Mocha = require('mocha')
const mocha = new Mocha()

mocha.addFile('spec/node/asciidoctor.spec.cjs')

// Run the tests.
mocha.run(function (failures) {
  process.exitCode = failures ? -1 : 0 // exit with non-zero status if there were failures
})
