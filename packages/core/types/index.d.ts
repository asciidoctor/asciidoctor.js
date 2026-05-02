/**
 * Get the version of Asciidoctor.js.
 *
 * @returns {string} - the version of Asciidoctor.js
 */
export function getVersion(): string;
/**
 * Get Asciidoctor core version number.
 *
 * @returns {string} - the version of Asciidoctor core (Ruby)
 */
export function getCoreVersion(): string;
/**
 * Parse the AsciiDoc source input into a Document.
 *
 * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
 * @param {Object} [options={}] - a plain object of options to control processing
 * @returns {Promise<Document>} - the parsed Document
 */
export function load(input: string | string[] | Buffer, options?: any): Promise<Document>;
/**
 * Parse the contents of the AsciiDoc source file into a Document.
 *
 * @param {string} filename - the path to the AsciiDoc source file
 * @param {Object} [options={}] - a plain object of options to control processing
 * @returns {Promise<Document>} - the parsed Document
 */
export function loadFile(filename: string, options?: any): Promise<Document>;
import { Document } from './document.js';
import { convert } from './convert.js';
import { convertFile } from './convert.js';
import { DocumentTitle } from './document.js';
import { Author } from './document.js';
import { Footnote } from './document.js';
import { ImageReference } from './document.js';
import { RevisionInfo } from './document.js';
import { Logger } from './logging.js';
import { AbstractNode } from './abstract_node.js';
import { AbstractBlock } from './abstract_block.js';
import { Inline } from './inline.js';
import { Block } from './block.js';
import { List } from './list.js';
import { ListItem } from './list.js';
import { Section } from './section.js';
import { Reader } from './reader.js';
import { SyntaxHighlighterBase } from './syntax_highlighter.js';
import { LoggerManager } from './logging.js';
import { MemoryLogger } from './logging.js';
import { NullLogger } from './logging.js';
import { SafeMode } from './constants.js';
import { ContentModel } from './constants.js';
import { Timings } from './timings.js';
import { Registry } from './extensions.js';
import { Processor } from './extensions.js';
import { ProcessorExtension } from './extensions.js';
import { Preprocessor } from './extensions.js';
import { TreeProcessor } from './extensions.js';
import { Postprocessor } from './extensions.js';
import { IncludeProcessor } from './extensions.js';
import { DocinfoProcessor } from './extensions.js';
import { BlockProcessor } from './extensions.js';
import { InlineMacroProcessor } from './extensions.js';
import { BlockMacroProcessor } from './extensions.js';
import { Extensions } from './extensions.js';
import { Cursor } from './reader.js';
import { Converter } from './converter.js';
import { DefaultFactory as DefaultConverterFactory } from './converter.js';
import { DefaultFactory as DefaultSyntaxHighlighterFactory } from './syntax_highlighter.js';
import Html5Converter from './converter/html5.js';
import { SyntaxHighlighter } from './syntax_highlighter.js';
export { convert, convertFile, Document, DocumentTitle, Author, Footnote, ImageReference, RevisionInfo, Logger, AbstractNode, AbstractBlock, Inline, Block, List, ListItem, Section, Reader, SyntaxHighlighterBase, LoggerManager, MemoryLogger, NullLogger, SafeMode, ContentModel, Timings, Registry, Processor, ProcessorExtension, Preprocessor, TreeProcessor, Postprocessor, IncludeProcessor, DocinfoProcessor, BlockProcessor, InlineMacroProcessor, BlockMacroProcessor, Extensions, Cursor, Converter as ConverterFactory, DefaultConverterFactory, DefaultSyntaxHighlighterFactory, Html5Converter, SyntaxHighlighter };
