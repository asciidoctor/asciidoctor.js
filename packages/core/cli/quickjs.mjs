import * as std from 'std';
import Asciidoctor from "build/asciidoctor-quickjs.js";

const _ = scriptArgs.shift();
const USAGE = `USAGE: ${_} [OPTIONS] [FILE|-]
EXAMPLE: ${_} --safe=0 --doctype=\\"article\\" <<< include::partial.adoc[]`
const die = (msg) => console.log(msg) + std.exit(1);
const [file = ""] = scriptArgs.filter(arg => !arg.startsWith('-'));
const options = Object.fromEntries(scriptArgs.filter(arg => arg.startsWith('-'))
    .map(arg => arg.split('=')).map(([k, ...v]) => [k.replace(/^-+/, ''), std.parseExtJSON(v.join('=') || '1')]));
if (options.help) die(USAGE);
std.err.puts(`converting ${file ? "file:" + file : 'stdin'} options:${JSON.stringify(options)}\n`);
const body = file ? std.loadFile(file) : std.in.readAsString();
if (!body) die(USAGE);
try {
    console.log(Asciidoctor().convert(body, options));
} catch (e) {
    console.log(e)
}