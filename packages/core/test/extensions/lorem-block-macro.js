const dictionary = {
  words: ['lorem', 'ipsum', 'dolor', 'sit', 'amet'],
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min
}

function lorem(opts) {
  const count = opts.count
  const units = opts.units
  const words = dictionary.words
  if (units === 'sentences') {
    const sentences = []
    const sentence = []
    for (let i = 0; i < count; i++) {
      const sentenceLength = getRandomArbitrary(5, 15)
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
    this.named('lorem')
    this.process((parent, target, attrs) => {
      const size = parseInt(attrs.size, 10)
      const result = lorem({ count: size, units: target })
      return this.createBlock(parent, 'paragraph', result)
    })
  })
}
