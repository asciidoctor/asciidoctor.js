/// <reference types="node" />
// TypeScript Version: 2.9
export interface AsciidoctorRuntime {
  ioModule: string | 'node';
  platform: string | 'node';
  engine: string | 'v8';
  framework: string;
}

export interface AsciidoctorDocument {
  getTitle(): string;
  setTitle(title: string): void;
}

export class Asciidoctor {
  getVersion(): string;
  getCoreVersion(): string;
  getRuntime(): AsciidoctorRuntime;
  convert(input: string | Buffer, options?: any): string | AsciidoctorDocument;
  convertFile(filename: string, options?: any): string | AsciidoctorDocument;
  load(input: string | Buffer, options?: any): AsciidoctorDocument;
  loadFile(filename: string, options?: any): AsciidoctorDocument;
  toString(): string;
}

export default function asciidoctor(): Asciidoctor;
