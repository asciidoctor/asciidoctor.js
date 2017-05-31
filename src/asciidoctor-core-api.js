/**
 * Convert a JSON to an (Opal) Hash.
 * @private
 */
var toHash = function (object) {
  if (object && !object.smap) {
    return Opal.hash(object);
  }
  return object;
};

/**
 * @private
 */
var prepareOptions = function (options) {
  if (options = toHash(options)) {
    var attrs = options['$[]']('attributes');
    if (attrs && typeof attrs === 'object' && attrs.constructor.name === 'Object') {
      options = options.$dup();
      options['$[]=']('attributes', toHash(attrs));
    }
  }
  return options;
};

// Asciidoctor API

/**
 * @namespace
 * @description
 * Methods for parsing AsciiDoc input files and converting documents.
 *
 * AsciiDoc documents comprise a header followed by zero or more sections.
 * Sections are composed of blocks of content. For example:
 * <pre>
 *   = Doc Title
 *
 *   == Section 1
 *
 *   This is a paragraph block in the first section.
 *
 *   == Section 2
 *
 *   This section has a paragraph block and an olist block.
 *
 *   . Item 1
 *   . Item 2
 * </pre>
 *
 * @example
 * asciidoctor.convertFile('sample.adoc');
 */
var Asciidoctor = Opal.Asciidoctor['$$class'];

/**
 * Parse the AsciiDoc source input into an {@link Document} and convert it to the specified backend format.
 *
 * Accepts input as a Buffer or String.
 *
 * @param {string|Buffer} input - AsciiDoc input as String or Buffer
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {string|Document} - returns the {@link Document} object if the converted String is written to a file,
 * otherwise the converted String
 * @memberof Asciidoctor
 * @example
 * var input = '= Hello, AsciiDoc!\n' +
 *   'Guillaume Grossetie <ggrossetie@example.com>\n\n' +
 *   'An introduction to http://asciidoc.org[AsciiDoc].\n\n' +
 *   '== First Section\n\n' +
 *   '* item 1\n' +
 *   '* item 2\n';
 *
 * var html = asciidoctor.convert(input);
 */
Asciidoctor.$$proto.convert = function (input, options) {
  if (typeof input === 'object' && input.constructor.name === 'Buffer') {
    input = input.toString('utf8');
  }
  var result = this.$convert(input, prepareOptions(options));
  if (result === Opal.nil) {
    return '';
  }
  return result;
};

/**
 * Parse the AsciiDoc source input into an {@link Document} and convert it to the specified backend format.
 *
 * @param {string} filename - source filename
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {string|Document} - returns the {@link Document} object if the converted String is written to a file,
 * otherwise the converted String
 * @memberof Asciidoctor
 * @example
 * var html = asciidoctor.convertFile('./document.adoc');
 */
Asciidoctor.$$proto.convertFile = function (filename, options) {
  return this.$convert_file(filename, prepareOptions(options));
};

/**
 * Parse the AsciiDoc source input into an {@link Document}
 *
 * Accepts input as a Buffer or String.
 *
 * @param {string|Buffer} input - AsciiDoc input as String or Buffer
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {Document} - returns the {@link Document} object
 * @memberof Asciidoctor
 */
Asciidoctor.$$proto.load = function (input, options) {
  if (typeof input === 'object' && input.constructor.name === 'Buffer') {
    input = input.toString('utf8');
  }
  return this.$load(input, prepareOptions(options));
};

/**
 * Parse the contents of the AsciiDoc source file into an {@link Document}
 *
 * @param {string} filename - source filename
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {Document} - returns the {@link Document} object
 * @memberof Asciidoctor
 */
Asciidoctor.$$proto.loadFile = function (filename, options) {
  return this.$load_file(filename, prepareOptions(options));
};

// AbstractBlock API

/**
 * @namespace
 * @extends AbstractNode
 */
var AbstractBlock = Opal.Asciidoctor.AbstractBlock;

/**
 * Get the String title of this Block with title substitions applied
 *
 * The following substitutions are applied to block and section titles:
 *
 * <code>specialcharacters</code>, <code>quotes</code>, <code>replacements</code>, <code>macros</code>, <code>attributes</code> and <code>post_replacements</code>
 *
 * @memberof AbstractBlock
 * @returns {string} - returns the converted String title for this Block, or an empty string if the assigned title is falsy
 * @example
 * block.title // "Foo 3^ # {two-colons} Bar(1)"
 * block.getTitle(); // "Foo 3^ # :: Bar(1)"
 */
AbstractBlock.$$proto.getTitle = function () {
  var result = this.$title();
  if (result === Opal.nil) {
    return '';
  }
  return result;
};

/**
 * Get the style (block type qualifier) for this block.
 * @memberof AbstractBlock
 * @returns {string} - returns the style for this block
 */
AbstractBlock.$$proto.getStyle = function () {
  return this.style;
};

/**
 * Get the caption for this block.
 * @memberof AbstractBlock
 * @returns {string} - returns the caption for this block
 */
AbstractBlock.$$proto.getCaption = function () {
  return this.caption;
};

/**
 * Get the level of this section or the section level in which this block resides.
 * @memberof AbstractBlock
 * @returns {number} - returns the level of this section
 */
AbstractBlock.$$proto.getLevel = function () {
  return this.level;
};

/**
 * Get the list of {@link AbstractBlock} sub-blocks for this block.
 * @memberof AbstractBlock
 * @returns {Array} - returns a list of {@link AbstractBlock} sub-blocks
 */
AbstractBlock.$$proto.getBlocks = function () {
  return this.blocks;
};

/**
 * Get the converted result of the child blocks by converting the children appropriate to content model that this block supports.
 * @memberof AbstractBlock
 * @returns {string} - returns the converted result of the child blocks
 */
AbstractBlock.$$proto.getContent = function () {
  return this.$content();
};

/**
 * Get the converted content for this block.
 * If the block has child blocks, the content method should cause them to be converted
 * and returned as content that can be included in the parent block's template.
 * @memberof AbstractBlock
 * @returns {string} - returns the converted String content for this block
 */
AbstractBlock.$$proto.convert = function () {
  return this.$convert();
};

/**
 * Query for all descendant block-level nodes in the document tree
 * that match the specified selector (context, style, id, and/or role).
 * If a function block is given, it's used as an additional filter.
 * If no selector or function block is supplied, all block-level nodes in the tree are returned.
 * @param {Object} [selector]
 * @param {function} [block]
 * @example
 * doc.findBy({'context': 'section'});
 * // => { level: 0, title: "Hello, AsciiDoc!", blocks: 0 }
 * // => { level: 1, title: "First Section", blocks: 1 }
 *
 * doc.findBy({'context': 'section'}, function (section) { return section.getLevel() === 1; });
 * // => { level: 1, title: "First Section", blocks: 1 }
 *
 * doc.findBy({'context': 'listing', 'style': 'source'});
 * // => { context: :listing, content_model: :verbatim, style: "source", lines: 1 }
 *
 * @memberof AbstractBlock
 * @returns {Array} - returns a list of block-level nodes that match the filter or an empty list if no matches are found
 */
AbstractBlock.$$proto.findBy = function (selector, block) {
  if (typeof block === 'undefined' && typeof selector === 'function') {
    return Opal.send(this, 'find_by', null, selector);
  }
  else if (typeof block === 'function') {
    return Opal.send(this, 'find_by', [toHash(selector)], block);
  }
  else {
    return this.$find_by(toHash(selector));
  }
};

/**
 * Get the source line number where this block started.
 * @memberof AbstractBlock
 * @returns {number} - returns the source line number where this block started
 */
AbstractBlock.$$proto.getLineNumber = function () {
  var value = this.$lineno();
  if (value === Opal.nil) {
    return undefined;
  }
  return value;
};

// AbstractNode API

/**
 * @namespace
 */
var AbstractNode = Opal.Asciidoctor.AbstractNode;

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getAttributes = function () {
  var to = {}, from = this.attributes;
  for (var i = 0, key, keys = from.$$keys, data = from.$$smap, len = keys.length; i < len; i++) {
    key = keys[i];
    to[key] = data[key];
  }
  return to;
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getAttribute = function (name, defaultValue, inherit) {
  var value = this.$attr(name, defaultValue, inherit);
  if (value === Opal.nil) {
    return undefined;
  }
  return value;
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.isAttribute = function (name, expectedValue, inherit) {
  var value = this['$attr?'](name, expectedValue, inherit);
  if (value === Opal.nil) {
    return undefined;
  }
  return value;
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.setAttribute = function (name, value, overwrite) {
  if (typeof overwrite === 'undefined') {
    overwrite = true;
  }
  return this.$set_attr(name, value, overwrite);
};

/**
 * Get the {@link Document} to which this node belongs.
 *
 * @memberof AbstractNode
 * @returns {Document} - returns the {@link Document} object to which this node belongs.
 */
AbstractNode.$$proto.getDocument = function () {
  return this.$document();
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.isInline = function () {
  return this['$inline?']();
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.isBlock = function () {
  return this['$block?']();
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.isRole = function (expected) {
  return this['$role?'](expected);
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getRole = function () {
  return this.$role();
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.hasRole = function (name) {
  return this['$has_role?'](name);
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getRoles = function () {
  return this.$roles();
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.addRole = function (name) {
  return this.$add_role(name);
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.removeRole = function (name) {
  return this.$remove_role(name);
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.isReftext = function () {
  return this['$reftext?']();
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getReftext = function () {
  return this.$reftext();
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getContext = function () {
  var context = this.context;
  if (context && typeof context.$to_s === 'function') {
    // Convert Ruby Symbol to String
    return context.$to_s();
  }
  return context;
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getId = function () {
  return this.id;
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.isOption = function (name) {
  return this['$option?'](name);
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.setOption = function (name) {
  return this.$set_option(name);
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getIconUri = function (name) {
  return this.$icon_uri(name);
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getMediaUri = function (target, assetDirKey) {
  return this.$media_uri(target, assetDirKey);
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getImageUri = function (targetImage, assetDirKey) {
  return this.$image_uri(targetImage, assetDirKey);
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.getConverter = function () {
  return this.$converter();
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.readContents = function (target, options) {
  return this.$read_contents(target, toHash(options));
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.readAsset = function (path, options) {
  return this.$read_asset(path, toHash(options));
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.normalizeWebPath = function (target, start, preserveTargetUri) {
  return this.$normalize_web_path(target, start, preserveTargetUri);
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.normalizeSystemPath = function (target, start, jail, options) {
  return this.$normalize_system_path(target, start, jail, toHash(options));
};

/**
 * @memberof AbstractNode
 */
AbstractNode.$$proto.normalizeAssetPath = function (assetRef, assetName, autoCorrect) {
  return this.$normalize_asset_path(assetRef, assetName, autoCorrect);
};

// Document API

/**
 * @namespace
 * @extends AbstractBlock
 */
var Document = Opal.Asciidoctor.Document;

/**
 * @returns {string} - returns the level-0 section
 * @memberof Document
 */
Document.$$proto.getHeader = function () {
  return this.header;
};

/**
 * @memberof Document
 */
Document.$$proto.setAttribute = function (name, value) {
  return this.$set_attribute(name, value);
};

/**
 * @memberof Document
 */
Document.$$proto.removeAttribute = function (name) {
  this.attributes.$delete(name);
  this.attribute_overrides.$delete(name);
};

/**
 * @memberof Document
 */
Document.$$proto.convert = function (options) {
  var result = this.$convert(toHash(options));
  if (result === Opal.nil) {
    return '';
  }
  return result;
};

/**
 * @memberof Document
 */
Document.$$proto.write = function (output, target) {
  return this.$write(output, target);
};

/**
 * @returns {string} - returns the full name of the author as a String
 * @memberof Document
 */
Document.$$proto.getAuthor = function () {
  return this.$author();
};

/**
 * @memberof Document
 */
Document.$$proto.getSource = function () {
  return this.$source();
};

/**
 * @memberof Document
 */
Document.$$proto.getSourceLines = function () {
  return this.$source_lines();
};

/**
 * @memberof Document
 */
Document.$$proto.isNested = function () {
  return this['$nested?']();
};

/**
 * @memberof Document
 */
Document.$$proto.hasFootnotes = function () {
  return this['$footnotes?']();
};

/**
 * @memberof Document
 */
Document.$$proto.getFootnotes = function () {
  return this.$footnotes();
};

/**
 * @memberof Document
 */
Document.$$proto.isEmbedded = function () {
  return this['$embedded?']();
};

/**
 * @memberof Document
 */
Document.$$proto.hasExtensions = function () {
  return this['$extensions?']();
};

/**
 * @memberof Document
 */
Document.$$proto.getDoctype = function () {
  return this.$doctype();
};

/**
 * @memberof Document
 */
Document.$$proto.getBackend = function () {
  return this.$backend();
};

/**
 * @memberof Document
 */
Document.$$proto.isBasebackend = function (base) {
  return this['$basebackend?'](base);
};

/**
 * Get the title explicitly defined in the document attributes.
 * @returns {string}
 * @see {@link AbstractNode#getAttributes}
 * @memberof Document
 */
Document.$$proto.getTitle = function () {
  return this.$title();
};

/**
 * @memberof Document
 */
Document.$$proto.setTitle = function (title) {
  return this['$title='](title);
};

/**
 * @memberof Document
 * @returns {Document/Title} - returns a {@link Document/Title}
 */
Document.$$proto.getDocumentTitle = function (options) {
  return this.$doctitle(toHash(options));
};

/**
 * @memberof Document
 * @see {@link Document#getDocumentTitle}
 */
Document.$$proto.getDoctitle = function (options) {
  return this.getDocumentTitle(options);
};

/**
 * Get the document revision date from document header (document attribute <code>revdate</code>).
 * @memberof Document
 */
Document.$$proto.getRevisionDate = function () {
  return this.getAttribute('revdate');
};

/**
 * @memberof Document
 * @see Document#getRevisionDate
 */
Document.$$proto.getRevdate = function () {
  return this.getRevisionDate();
};

/**
 * Get the document revision number from document header (document attribute <code>revnumber</code>).
 * @memberof Document
 */
Document.$$proto.getRevisionNumber = function () {
  return this.getAttribute('revnumber');
};

/**
 * Get the document revision remark from document header (document attribute <code>revremark</code>).
 * @memberof Document
 */
Document.$$proto.getRevisionRemark = function () {
  return this.getAttribute('revremark');
};

// private constructor
Document.RevisionInfo = function (date, number, remark) {
  this.date = date;
  this.number = number;
  this.remark = remark;
};

/**
 * @class
 * @namespace
 * @module Document/RevisionInfo
 */
var RevisionInfo = Document.RevisionInfo;

/**
 * Get the document revision date from document header (document attribute <code>revdate</code>).
 * @memberof Document/RevisionInfo
 */
RevisionInfo.prototype.getDate = function () {
  return this.date;
};

/**
 * Get the document revision number from document header (document attribute <code>revnumber</code>).
 * @memberof Document/RevisionInfo
 */
RevisionInfo.prototype.getNumber = function () {
  return this.number;
};

/**
 * Get the document revision remark from document header (document attribute <code>revremark</code>).
 * A short summary of changes in this document revision.
 * @memberof Document/RevisionInfo
 */
RevisionInfo.prototype.getRemark = function () {
  return this.remark;
};

/**
 * @memberof Document/RevisionInfo
 * @returns {boolean} - returns true if the revision info is empty (ie. not defined), otherwise false
 */
RevisionInfo.prototype.isEmpty = function () {
  return this.date === undefined && this.number === undefined && this.remark === undefined;
};

/**
 * @memberof Document
 * @returns {Document/RevisionInfo} - returns a {@link Document/RevisionInfo}
 */
Document.$$proto.getRevisionInfo = function () {
  return new Document.RevisionInfo(this.getRevisionDate(), this.getRevisionNumber(), this.getRevisionRemark());
};

/**
 * @memberof Document
 * @returns {boolean} - returns true if the document contains revision info, otherwise false
 */
Document.$$proto.hasRevisionInfo = function () {
  var revisionInfo = this.getRevisionInfo();
  return !revisionInfo.isEmpty();
};

/**
 * @memberof Document
 */
Document.$$proto.getNotitle = function () {
  return this.$notitle();
};

/**
 * @memberof Document
 */
Document.$$proto.getNoheader = function () {
  return this.$noheader();
};

/**
 * @memberof Document
 */
Document.$$proto.getNofooter = function () {
  return this.$nofooter();
};

/**
 * @memberof Document
 */
Document.$$proto.hasHeader = function () {
  return this['$header?']();
};

/**
 * @memberof Document
 */
Document.$$proto.deleteAttribute = function (name) {
  return this.$delete_attribute(name);
};

/**
 * @memberof Document
 */
Document.$$proto.isAttributeLocked = function (name) {
  return this['$attribute_locked?'](name);
};

/**
 * @memberof Document
 */
Document.$$proto.parse = function (data) {
  return this.$parse(data);
};

/**
 * @memberof Document
 */
Document.$$proto.getDocinfo = function (docinfoLocation, suffix) {
  return this.$docinfo(docinfoLocation, suffix);
};

/**
 * @memberof Document
 */
Document.$$proto.hasDocinfoProcessors = function (docinfoLocation) {
  return this['$docinfo_processors?'](docinfoLocation);
};

/**
 * @memberof Document
 */
Document.$$proto.counterIncrement = function (counterName, block) {
  return this.$counter_increment(counterName, block);
};

/**
 * @memberof Document
 */
Document.$$proto.counter = function (name, seed) {
  return this.$counter(name, seed);
};

/**
 * @memberof Document
 */
Document.$$proto.getSafe = function () {
  return this.$safe;
};

/**
 * @memberof Document
 */
Document.$$proto.getCompatMode = function () {
  return this.$compat_mode;
};

/**
 * @memberof Document
 */
Document.$$proto.getSourcemap = function () {
  return this.$sourcemap;
};

/**
 * @memberof Document
 */
Document.$$proto.getReferences = function () {
  return this.$references;
};

/**
 * @memberof Document
 */
Document.$$proto.getCounters = function () {
  return this.$counters;
};

/**
 * @memberof Document
 */
Document.$$proto.getCallouts = function () {
  return this.$callouts;
};

/**
 * @memberof Document
 */
Document.$$proto.getBaseDir = function () {
  return this.$base_dir;
};

/**
 * @memberof Document
 */
Document.$$proto.getOptions = function () {
  return this.$options;
};

/**
 * @memberof Document
 */
Document.$$proto.getOutfilesuffix = function () {
  return this.$outfilesuffix;
};

/**
 * @memberof Document
 */
Document.$$proto.getParentDocument = function () {
  return this.$parent_document;
};

/**
 * @memberof Document
 */
Document.$$proto.getReader = function () {
  return this.$reader;
};

/**
 * @memberof Document
 */
Document.$$proto.getConverter = function () {
  return this.$converter;
};

/**
 * @memberof Document
 */
Document.$$proto.getExtensions = function () {
  return this.$extensions;
};

// Document.Title API

/**
 * @namespace
 * @module Document/Title
 */
var Title = Document.Title;

/**
 * @memberof Document/Title
 */
Title.$$proto.getMain = function () {
  return this.main;
};

/**
 * @memberof Document/Title
 */
Title.$$proto.getCombined = function () {
  return this.combined;
};

/**
 * @memberof Document/Title
 */
Title.$$proto.getSubtitle = function () {
  return this.subtitle;
};

/**
 * @memberof Document/Title
 */
Title.$$proto.isSanitized = function () {
  var sanitized = this['$sanitized?']();
  if (sanitized === Opal.nil) {
    return false;
  }
  return sanitized;
};

/**
 * @memberof Document/Title
 */
Title.$$proto.hasSubtitle = function () {
  return this['$subtitle?']();
};

// Inline API

/** @namespace */
var Inline = Opal.Asciidoctor.Inline;

/**
 * @memberof Inline
 * @extends AbstractNode
 */
Inline.$$proto.convert = function () {
  return this.$convert();
};

// Reader API

/** @namespace */
var Reader = Opal.Asciidoctor.Reader;

/**
 * @memberof Reader
 */
Reader.$$proto.pushInclude = function (data, file, path, lineno, attributes) {
  return this.$push_include(data, file, path, lineno, attributes);
};

/**
 * Get the current location of the reader's cursor, which encapsulates the
 * file, dir, path, and lineno of the file being read.
 *
 * @memberof Reader
 */
Reader.$$proto.getCursor = function () {
  return this.$cursor();
};
