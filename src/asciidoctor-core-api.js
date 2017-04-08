var toHash = function (object) {
  if (object && !object.smap) {
    return Opal.hash(object);
  }
  return object;
};

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
 * @param {String|Buffer} input - AsciiDoc input as String or Buffer
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {String|Document} - returns the {@link Document} object if the converted String is written to a file,
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
 * @param {String} filename - source filename
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {String|Document} - returns the {@link Document} object if the converted String is written to a file,
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
 * @param {String|Buffer} input - AsciiDoc input as String or Buffer
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
 * @param {String} filename - source filename
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {Document} - returns the {@link Document} object
 * @memberof Asciidoctor
 */
Asciidoctor.$$proto.loadFile = function (filename, options) {
  return this.$load_file(filename, prepareOptions(options));
};

// AbstractBlock API

Opal.Asciidoctor.AbstractBlock.$$proto.getTitle = function () {
  var result = this.$title();
  if (result === Opal.nil) {
    return '';
  }
  return result;
};

Opal.Asciidoctor.AbstractBlock.$$proto.getStyle = function () {
  return this.style;
};

Opal.Asciidoctor.AbstractBlock.$$proto.getCaption = function () {
  return this.caption;
};

Opal.Asciidoctor.AbstractBlock.$$proto.getLevel = function () {
  return this.level;
};

Opal.Asciidoctor.AbstractBlock.$$proto.getBlocks = function () {
  return this.blocks;
};

Opal.Asciidoctor.AbstractBlock.$$proto.getContent = function () {
  return this.$content();
};

Opal.Asciidoctor.AbstractBlock.$$proto.convert = function () {
  return this.$convert();
};

Opal.Asciidoctor.AbstractBlock.$$proto.findBy = function (selector, block) {
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

Opal.Asciidoctor.AbstractBlock.$$proto.convert = function () {
  return this.$convert();
};

// AbstractNode API

Opal.Asciidoctor.AbstractNode.$$proto.getAttributes = function () {
  var to = {}, from = this.attributes;
  for (var i = 0, key, keys = from.$$keys, data = from.$$smap, len = keys.length; i < len; i++) {
    key = keys[i];
    to[key] = data[key];
  }
  return to;
};

Opal.Asciidoctor.AbstractNode.$$proto.getAttribute = function (name, defaultValue, inherit) {
  var value = this.$attr(name, defaultValue, inherit);
  if (value === Opal.nil) {
    return undefined;
  }
  return value;
};

Opal.Asciidoctor.AbstractNode.$$proto.isAttribute = function (name, expectedValue, inherit) {
  var value = this['$attr?'](name, expectedValue, inherit);
  if (value === Opal.nil) {
    return undefined;
  }
  return value;
};

Opal.Asciidoctor.AbstractNode.$$proto.setAttribute = function (name, value, overwrite) {
  if (typeof overwrite === 'undefined') {
    overwrite = true;
  }
  return this.$set_attribute(name, value, overwrite);
};

Opal.Asciidoctor.AbstractNode.$$proto.isInline = function () {
  return this['$inline?']();
};

Opal.Asciidoctor.AbstractNode.$$proto.isBlock = function () {
  return this['$block?']();
};

Opal.Asciidoctor.AbstractNode.$$proto.isRole = function (expected) {
  return this['$role?'](expected);
};

Opal.Asciidoctor.AbstractNode.$$proto.getRole = function () {
  return this.$role();
};

Opal.Asciidoctor.AbstractNode.$$proto.hasRole = function (name) {
  return this['$has_role?'](name);
};

Opal.Asciidoctor.AbstractNode.$$proto.getRoles = function () {
  return this.$roles();
};

Opal.Asciidoctor.AbstractNode.$$proto.addRole = function (name) {
  return this.$add_role(name);
};

Opal.Asciidoctor.AbstractNode.$$proto.removeRole = function (name) {
  return this.$remove_role(name);
};

Opal.Asciidoctor.AbstractNode.$$proto.isReftext = function () {
  return this['$reftext?']();
};

Opal.Asciidoctor.AbstractNode.$$proto.getReftext = function () {
  return this.$reftext();
};

Opal.Asciidoctor.AbstractNode.$$proto.getContext = function () {
  var context = this.context;
  if (context && typeof context.$to_s === 'function') {
    // Convert Ruby Symbol to String
    return context.$to_s();
  }
  return context;
};

Opal.Asciidoctor.AbstractNode.$$proto.getId = function () {
  return this.id;
};

Opal.Asciidoctor.AbstractNode.$$proto.isOption = function (name) {
  return this['$option?'](name);
};

Opal.Asciidoctor.AbstractNode.$$proto.setOption = function (name) {
  return this.$set_option(name);
};

Opal.Asciidoctor.AbstractNode.$$proto.getIconUri = function (name) {
  return this.$icon_uri(name);
};

Opal.Asciidoctor.AbstractNode.$$proto.getMediaUri = function (target, assetDirKey) {
  return this.$media_uri(target, assetDirKey);
};

Opal.Asciidoctor.AbstractNode.$$proto.getImageUri = function (targetImage, assetDirKey) {
  return this.$image_uri(targetImage, assetDirKey);
};

Opal.Asciidoctor.AbstractNode.$$proto.getConverter = function () {
  return this.$converter();
};

Opal.Asciidoctor.AbstractNode.$$proto.readContents = function (target, options) {
  return this.$read_contents(target, toHash(options));
};

Opal.Asciidoctor.AbstractNode.$$proto.readAsset = function (path, options) {
  return this.$read_asset(path, toHash(options));
};

Opal.Asciidoctor.AbstractNode.$$proto.normalizeWebPath = function (target, start, preserveTargetUri) {
  return this.$normalize_web_path(target, start, preserveTargetUri);
};

Opal.Asciidoctor.AbstractNode.$$proto.normalizeSystemPath = function (target, start, jail, options) {
  return this.$normalize_system_path(target, start, jail, toHash(options));
};

Opal.Asciidoctor.AbstractNode.$$proto.normalizeAssetPath = function (assetRef, assetName, autoCorrect) {
  return this.$normalize_asset_path(assetRef, assetName, autoCorrect);
};

// Document API

/** @namespace */
var Document = Opal.Asciidoctor.Document;

/**
 * @returns {String} - returns the level-0 section
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
 * @returns {String} - returns the full name of the author as a String
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
 */
Document.$$proto.getDoctitle = Document.$$proto.getDocumentTitle = function (options) {
  return this.$doctitle(toHash(options));
};

/**
 * @memberof Document
 */
Document.$$proto.getRevdate = Document.$$proto.getRevisionDate = function () {
  return this.$revdate();
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

Opal.Asciidoctor.Document.Title.$$proto.getMain = function () {
  return this.main;
};

Opal.Asciidoctor.Document.Title.$$proto.getCombined = function () {
  return this.combined;
};

Opal.Asciidoctor.Document.Title.$$proto.getSubtitle = function () {
  return this.subtitle;
};

Opal.Asciidoctor.Document.Title.$$proto.isSanitized = function () {
  var sanitized = this['$sanitized?']();
  if (sanitized === Opal.nil) {
    return false;
  }
  return sanitized;
};

Opal.Asciidoctor.Document.Title.$$proto.hasSubtitle = function () {
  return this['$subtitle?']();
};

Opal.Asciidoctor.Inline.$$proto.convert = function () {
  return this.$convert();
};
