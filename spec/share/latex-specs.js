var commonSpec = function (testOptions, Opal, Asciidoctor) {

  describe(testOptions.platform, function () {

    describe('When loaded', function () {
      it('Opal should not be null', function () {
        expect(Opal).not.toBe(null);
      });

      it('Asciidoctor should not be null', function () {
        expect(Asciidoctor).not.toBe(null);
      });
    });

    describe('Parsing', function () {
      it('should render asciidoctor-latex question/answer block', function () {
        var html = Asciidoctor.convert('[env.question]\n--\nWhat is the speed of light?\n--\n\n[click.answer]\n--\n300,000 km/sec\n--', null);
        expect(html).toContain('<div class="openblock question">\n' +
                               '<div class="title">Question 1.</div><div class="content">\n' + 
                               '<div class=\'click_oblique\'>\n' +
                               'What is the speed of light?\n' +
                               '</div>\n' +
                               '</div>\n' +
                               '</div>\n' +
                               '<div class="openblock click">\n' +
                               '<div class="title">Answer</div><div class="content">\n' +
                               '<div class=\'click_oblique\'>\n' +
                               '300,000 km/sec\n' +
                               '</div>\n' +
                               '</div>\n' +
                               '</div>'
        );
      });
    });
  });
};

// Export commonSpec for node test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = commonSpec;
}
