load('./build/asciidoctor-all.js');

var data = '= asciidoctor.js, AsciiDoc in JavaScript\n' +
'Doc Writer <docwriter@example.com>\n\n' +
'Asciidoctor and Opal come together to bring\n' +
'http://asciidoc.org[AsciiDoc] to the browser!.\n\n' +
'== Technologies\n\n' +
'* AsciiDoc\n' +
'* Asciidoctor\n' +
'* Opal\n\n' +
'NOTE: That\'s all she wrote!!!\n\n' +
'include::spec/share/include.adoc[]';

var options = {'safe': 'server', attributes: ['showtitle']};
var html = Opal.Asciidoctor.convert(data, options);
print(html);
