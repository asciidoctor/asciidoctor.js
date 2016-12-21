var toHash = function (object) {
  if (object && !object.smap) {
    return Opal.hash(object);
  }
  return object;
};

// Asciidoctor API

Opal.Asciidoctor['$$class'].$$proto.convert = function (input, options) {
  var result = this.$convert(input, toHash(options));
  if (result === Opal.nil) {
    return '';
  }
  return result;
};

Opal.Asciidoctor['$$class'].$$proto.convertFile = function (filename, options) {
  return this.$convert_file(filename, toHash(options));
};

Opal.Asciidoctor['$$class'].$$proto.load = function (input, options) {
  return this.$load(input, toHash(options));
};

Opal.Asciidoctor['$$class'].$$proto.loadFile = function (filename, options) {
  return this.$load_file(filename, toHash(options));
};

// AbstractBlock API

Opal.Asciidoctor.AbstractBlock.$$proto.getTitle = function () {
  var result = this.title;
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

Opal.Asciidoctor.AbstractBlock.$$proto.delegate = function () {
  return this.$delegate();
};

Opal.Asciidoctor.AbstractBlock.$$proto.findBy = function (selector) {
  return this.$find_by(selector);
};

Opal.Asciidoctor.AbstractBlock.$$proto.convert = function () {
  return this.$convert();
};

// AbstractNode API

Opal.Asciidoctor.AbstractNode.$$proto.getAttributes = function () {
  return this.attributes;
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
  var context =  this.context;
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

Opal.Asciidoctor.AbstractNode.$$proto.getIconURI = function (name) {
  return this.$icon_uri(name);
};

Opal.Asciidoctor.AbstractNode.$$proto.getMediaURI = function (target, assetDirKey) {
  return this.$media_uri(target, assetDirKey);
};

Opal.Asciidoctor.AbstractNode.$$proto.getImageURI = function (targetImage, assetDirKey) {
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

Opal.Asciidoctor.AbstractNode.$$proto.normalizeWebPath = function (target, start, preserveTargetURI) {
  return this.$normalize_web_path(target, start, preserveTargetURI);
};

Opal.Asciidoctor.AbstractNode.$$proto.normalizeSystemPath = function (target, start, jail, options) {
  return this.$normalize_system_path(target, start, jail, toHash(options));
};

Opal.Asciidoctor.AbstractNode.$$proto.normalizeAssetPath = function (assetRef, assetName, autoCorrect) {
  return this.$normalize_asset_path(assetRef, assetName, autoCorrect);
};

// Document API

Opal.Asciidoctor.Document.$$proto.getHeader = function () {
  return this.header;
};

Opal.Asciidoctor.Document.$$proto.setAttribute = function (name, value) {
  return this.$set_attribute(name, value);
};

Opal.Asciidoctor.Document.$$proto.removeAttribute = function (name) {
  this.attributes.$delete(name);
  this.attribute_overrides.$delete(name);
};

Opal.Asciidoctor.Document.$$proto.convert = function (options) {
  var result = this.$convert(toHash(options));
  if (result === Opal.nil) {
    return '';
  }
  return result;
};

Opal.Asciidoctor.Document.$$proto.write = function (output, target) {
  return this.$write(output, target);
};

Opal.Asciidoctor.Document.$$proto.getAuthor = function () {
  return this.$author();
};

Opal.Asciidoctor.Document.$$proto.getSource = function () {
  return this.$source();
};

Opal.Asciidoctor.Document.$$proto.getSourceLines = function () {
  return this.$source_lines();
};

Opal.Asciidoctor.Document.$$proto.isNested = function () {
  return this['$nested?']();
};

Opal.Asciidoctor.Document.$$proto.hasFootnotes = function () {
  return this['$footnotes?']();
};

Opal.Asciidoctor.Document.$$proto.getFootnotes = function () {
  return this.$footnotes();
};

Opal.Asciidoctor.Document.$$proto.isEmbedded = function () {
  return this['$embedded?']();
};

Opal.Asciidoctor.Document.$$proto.hasExtensions = function () {
  return this['$extensions?']();
};

Opal.Asciidoctor.Document.$$proto.getDoctype = function () {
  return this.$doctype();
};

Opal.Asciidoctor.Document.$$proto.getBackend = function () {
  return this.$backend();
};

Opal.Asciidoctor.Document.$$proto.isBasebackend = function (base) {
  return this['$basebackend?'](base);
};

Opal.Asciidoctor.Document.$$proto.getTitle = function () {
  return this.$title();
};

Opal.Asciidoctor.Document.$$proto.setTitle = function (title) {
  return this['$title='](title);
};

Opal.Asciidoctor.Document.$$proto.getDoctitle = function (options) {
  return this.$doctitle(toHash(options));
};

Opal.Asciidoctor.Document.$$proto.getRevdate = function () {
  return this.$revdate();
};

Opal.Asciidoctor.Document.$$proto.getNotitle = function () {
  return this.$notitle();
};

Opal.Asciidoctor.Document.$$proto.getNoheader = function () {
  return this.$noheader();
};

Opal.Asciidoctor.Document.$$proto.getNofooter = function () {
  return this.$nofooter();
};

Opal.Asciidoctor.Document.$$proto.hasHeader = function () {
  return this['$header?']();
};

Opal.Asciidoctor.Document.$$proto.deleteAttribute = function (name) {
  return this.$delete_attribute(name);
};

Opal.Asciidoctor.Document.$$proto.isAttributeLocked = function (name) {
  return this['$attribute_locked?'](name);
};

Opal.Asciidoctor.Document.$$proto.parse = function (data) {
  return this.$parse(data);
};

Opal.Asciidoctor.Document.$$proto.getDocinfo = function (docinfoLocation, suffix) {
  return this.$docinfo(docinfoLocation, suffix);
};

Opal.Asciidoctor.Document.$$proto.hasDocinfoProcessors = function (docinfoLocation) {
  return this['$docinfo_processors?'](docinfoLocation);
};

Opal.Asciidoctor.Document.$$proto.counterIncrement = function (counterName, block) {
  return this.$counter_increment(counterName, block);
};

Opal.Asciidoctor.Document.$$proto.counter = function (name, seed) {
  return this.$counter(name, seed);
};

Opal.Asciidoctor.Document.$$proto.getSafe = function () {
  return this.$safe;
};

Opal.Asciidoctor.Document.$$proto.getCompatMode = function () {
  return this.$compat_mode;
};

Opal.Asciidoctor.Document.$$proto.getSourcemap = function () {
  return this.$sourcemap;
};

Opal.Asciidoctor.Document.$$proto.getReferences = function () {
  return this.$references;
};

Opal.Asciidoctor.Document.$$proto.getCounters = function () {
  return this.$counters;
};

Opal.Asciidoctor.Document.$$proto.getCallouts = function () {
  return this.$callouts;
};

Opal.Asciidoctor.Document.$$proto.getBaseDir = function () {
  return this.$base_dir;
};

Opal.Asciidoctor.Document.$$proto.getOptions = function () {
  return this.$options;
};

Opal.Asciidoctor.Document.$$proto.getOutfilesuffix = function () {
  return this.$outfilesuffix;
};

Opal.Asciidoctor.Document.$$proto.getParentDocument = function () {
  return this.$parent_document;
};

Opal.Asciidoctor.Document.$$proto.getReader = function () {
  return this.$reader;
};

Opal.Asciidoctor.Document.$$proto.getConverter = function () {
  return this.$converter;
};

Opal.Asciidoctor.Document.$$proto.getExtensions = function () {
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
