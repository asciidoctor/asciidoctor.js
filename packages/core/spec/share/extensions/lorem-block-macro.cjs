/* global Opal */
// NOTE: Below we are using a minimalist implementation to generate lorem ipsum text.
// If you need a complete implementation, you can use the following Node package:
// var lorem = require('lorem-ipsum');
module.exports = () => {
  const Extensions = Opal.Asciidoctor.Extensions
  Extensions.register(function () {
    this.blockMacro(function () {
      const self = this
      self.named('lorem')
      self.process(function (parent, target, attrs) {
        const size = parseInt(attrs.size)
        const result = lorem({ count: size, units: target })
        return self.createBlock(parent, 'paragraph', result)
      })
    })
  })
}

const dictionary = {
  words: [
    'lorem',
    'ipsum',
    'dolor',
    'sit',
    'amet'
  ]
}

function getRandomArbitrary (min, max) {
  return Math.random() * (max - min) + min
}

function lorem (opts) {
  const count = opts.count
  const units = opts.units
  const words = dictionary.words
  if (units === 'sentences') {
    const sentences = []
    const sentence = []
    for (let i = 0; i < count; i++) {
      const sentenceLength = getRandomArbitrary(5, 15)
      for (let j = 0; j < sentenceLength; j++) {
        // use predictive position for testing purpose
        const position = j % words.length
        // var position = Math.floor(Math.random() * words.length);
        let word = dictionary.words[position]
        if (j === 0) {
          // capitalize the first letter
          word = word.charAt(0).toUpperCase() + word.slice(1)
        }
        sentence.push(word)
      }
      sentence[sentence.length - 1] += '.'
      sentences.push(sentence.join(' '))
    }
    return sentences.join(' ')
  }
}
