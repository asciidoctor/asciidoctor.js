// NOTE: Below we are using a minimalist implementation to generate lorem ipsum text.
// If you need a complete implementation, you can use the following Node package:
// import loremIpsum from 'lorem-ipsum'

const dictionary = {
  words: ['lorem', 'ipsum', 'dolor', 'sit', 'amet']
}

function lorem (opts) {
  const { count, units } = opts
  const words = dictionary.words
  if (units === 'sentences') {
    const sentences = []
    for (let i = 0; i < count; i++) {
      const sentence = []
      const sentenceLength = Math.random() * (15 - 5) + 5
      for (let j = 0; j < sentenceLength; j++) {
        const position = j % words.length
        let word = words[position]
        if (j === 0) {
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

export default function (registry) {
  registry.blockMacro(function () {
    const self = this
    self.named('lorem')
    self.process(function (parent, target, attrs) {
      const size = parseInt(attrs.size)
      const result = lorem({ count: size, units: target })
      return self.createBlock(parent, 'paragraph', result)
    })
  })
}