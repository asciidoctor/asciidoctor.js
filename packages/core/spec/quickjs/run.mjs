/* global Asciidoctor */
import Asciidoctor from '../../build/asciidoctor-quickjs.js'
// poor man mocha since QuickJS don't rely on NPM
const expect = (obj) => ({to:{include(str){if(!obj.includes(str))throw `${obj} does not contain ${str}`}}});
const describe = (title, todo) => todo(console.log(`${title}`));
const it = (title, todo) => todo(console.log(`  ${title}`));

const asciidoctor = Asciidoctor()
const data = '= asciidoctor.js, AsciiDoc in JavaScript\n' +
	'Doc Writer <docwriter@example.com>\n\n' +
	'Asciidoctor and Opal come together to bring\n' +
	'http://asciidoc.org[AsciiDoc] to the browser!.\n\n' +
	'== Technologies\n\n' +
	'* AsciiDoc\n' +
	'* Asciidoctor\n' +
	'* Opal\n\n' +
	'NOTE: That\'s all she wrote!!!\n\n'

describe('QuickJS', function () {
	it('should convert as HTML', function () {
		const opts = { }
		const html = asciidoctor.convert(data, opts);
		expect(html).to.include('<ul>');
	})
	it('should include stylesheet', function () {
		const opts = { safe: 0, header_footer: true, attributes: { stylesheet: "spec/fixtures/css/simple.css", showtitle: true } };
		const html = asciidoctor.convert(data, opts);
		expect(html).to.include('4078c0');
	})
	it('should include file', function () {
		const opts = { safe: 0 };
		const html = asciidoctor.convert('include::spec/fixtures/include.adoc[]', opts)
		expect(html).to.include('include content');
	})
})
