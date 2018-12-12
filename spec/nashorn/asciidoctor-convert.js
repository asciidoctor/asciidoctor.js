/* global Asciidoctor, load, print */
load('./build/asciidoctor-nashorn.js')
var asciidoctor = Asciidoctor()

var data = '= asciidoctor.js, AsciiDoc in JavaScript\n' +
'Doc Writer <docwriter@example.com>\n\n' +
'Asciidoctor and Opal come together to bring\n' +
'http://asciidoc.org[AsciiDoc] to the browser!.\n\n' +
'== Technologies\n\n' +
'* AsciiDoc\n' +
'* Asciidoctor\n' +
'* Opal\n\n' +
'NOTE: That\'s all she wrote!!!\n\n' +
'include::spec/fixtures/include.adoc[]'

var options = { safe: 'server', header_footer: true, attributes: { showtitle: true } }
var html = asciidoctor.convert(data, options)
print(html)
