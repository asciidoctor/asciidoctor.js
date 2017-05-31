var Extensions = Opal.Asciidoctor.Extensions;

// NOTE: Below we are using a minimalist implementation to generate lorem ipsum text.
// If you need a complete implementation, you can use the following Node package:
// var lorem = require('lorem-ipsum');

Extensions.register(function () {
  this.blockMacro(function () {
    var self = this;
    self.named('lorem');
    self.process(function (parent, target, attrs) {
      // FIXME: convert attrs to a JSON
      var size = parseInt(attrs['$[]']('size'));
      var result = lorem({ count: size, units: target });
      return self.createBlock(parent, 'paragraph', result);
    });
  });
});

var dictionary = {
  words: [
    'lorem',
    'ipsum',
    'dolor',
    'sit',
    'amet'
  ]
};

function getRandomArbitrary (min, max) {
  return Math.random() * (max - min) + min;
}

function lorem (opts) {
  var count = opts.count;
  var units = opts.units;
  var words = dictionary.words;
  if (units === 'sentences') {
    var sentences = [];
    var sentence = [];
    for (i = 0; i < count; i++) {
      var sentenceLength = getRandomArbitrary(5, 15);
      for (j = 0; j < sentenceLength; j++) {
        // use predictive position for testing purpose
        var position = j % words.length;
        // var position = Math.floor(Math.random() * words.length);
        var word = dictionary.words[position];
        if (j === 0) {
          // capitalize the first letter
          word = word.charAt(0).toUpperCase() + word.slice(1);
        }
        sentence.push(word);
      }
      sentence[sentence.length - 1] += '.';
      sentences.push(sentence.join(' '));
    }
    return sentences.join(' ');
  }
}
