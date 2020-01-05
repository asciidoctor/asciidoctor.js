// use module-alias to resolve @asciidoctor/core
// see: https://github.com/microsoft/TypeScript/issues/10866
import 'module-alias/register';
import asciidoctor, { AsciidoctorDocument } from '@asciidoctor/core';
import { strict as assert } from 'assert';
import pkg from '../package.json';

const processor = asciidoctor();
const version: string = processor.getVersion();

// Version
assert(version === pkg.version);

const input = `= Document title

== First section

A normal paragraph.`;
const output = processor.convert(input, { to_file: `${__dirname}/output.html`, catalog_assets: true });
const asciidoctorDocument = output as AsciidoctorDocument;
const documentTitle: string = asciidoctorDocument.getTitle();
asciidoctorDocument.setTitle('The Dangerous & Thrilling Documentation');
