export interface IRuntime {
  ioModule: string | 'node';
  platform: string | 'node';
  engine: string | 'v8';
  framework: string;
}

export class Asciidoctor {
  getVersion(): string;
  getCoreVersion(): string;
  getRuntime(): IRuntime;
  convert(input: string | Buffer, options?: any): string | Document;
  convertFile(filename: string, options?: any): string | Document;
  load(input: string | Buffer, options?: any): Document;
  loadFile(filename: string, options?: any): Document;
  toString(): string;
}

export default function asciidoctor(): Asciidoctor;
