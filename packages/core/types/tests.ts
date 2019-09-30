import asciidoctor, { AsciidoctorDocument } from '@asciidoctor/core';

const processor = asciidoctor();
const version: string = processor.getVersion();

const input = `= Document title

== First section

A normal paragraph.`;
const output = processor.convert(input, { doctype: 'inline', to_file: 'output.html' });
const asciidoctorDocument = output as AsciidoctorDocument;
const documentTitle: string = asciidoctorDocument.getTitle();
asciidoctorDocument.setTitle('The Dangerous & Thrilling Documentation');
