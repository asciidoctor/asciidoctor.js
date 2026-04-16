// ESM conversion of abstract_node.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby symbols (:document, :context) are represented as plain strings.
//   - attr_reader / attr_accessor are implemented as plain instance properties;
//     cases where the setter has side effects use JS get/set pairs.
//   - Ruby methods ending in ? are renamed: attr? → hasAttr, block? → isBlock,
//     inline? → isInline, role? → hasRoleAttr, has_role? → hasRole,
//     option? → hasOption, reftext? → hasReftext.
//   - Ruby methods ending in = that have side effects use JS set accessors:
//     parent= → set parent(), role= → set role().
//   - snake_case method/property names are converted to camelCase:
//     node_name → nodeName, set_attr → setAttr, etc.
//   - The Logging mixin (logger getter) is provided as a default on AbstractNode;
//     it falls back to the document's logger or the global console.
//   - The Substitutors mixin is applied via Object.assign(AbstractNode.prototype, Substitutors)
//     after both modules are loaded (see the bottom of substitutors.js).
//   - File I/O in generateDataUri / readAsset uses node:fs/promises async APIs.
//     They are unavailable in browser environments — return null / empty data URI there.
//   - generateDataUriFromUri and readContents use the Fetch API and are async;
//     imageUri and readContents must be awaited when the data-uri + allow-uri-read
//     combination is active.
//   - Ruby's Set is represented as a JavaScript Set.

import { SafeMode, LF } from './constants.js'
import { isUriish, encodeSpacesInUri, isExtname, extname, prepareSourceString } from './helpers.js'

// ── Node.js fs (lazy, optional) ───────────────────────────────────────────────
// Loaded once at module init in Node.js; silently absent in browser environments.
let _fsp
let _fsConstants
try {
  _fsp = await import('node:fs/promises')
  _fsConstants = (await import('node:fs')).constants
} catch {}

async function isReadable (path) {
  if (!_fsp) return false
  try { await _fsp.access(path, _fsConstants.R_OK); return true } catch { return false }
}

// Public: An abstract base class that provides state and methods for managing a
// node of AsciiDoc content. The state and methods on this class are common to
// all content segments in an AsciiDoc document.
export class AbstractNode {
  constructor (parent, context, opts = {}) {
    // document is a special case – should refer to itself
    if (context === 'document') {
      this.document = this
    } else if (parent) {
      this._parent = parent
      this.document = parent.document
    }
    this.context = context
    this.nodeName = String(context)
    // NOTE the value of the attributes option may be undefined on an Inline node
    const attrs = opts.attributes
    this.attributes = attrs ? { ...attrs } : {}
    this.passthroughs = []
  }

  // Public: Get/Set the parent of this node.
  // The setter also updates the document reference.
  get parent () { return this._parent }
  set parent (parent) {
    this._parent = parent
    this.document = parent.document
  }

  // Public: Get the space-separated role string for this node.
  // Set accepts a single role name, a space-separated string, or an Array.
  get role () { return this.attributes.role }
  set role (names) {
    this.attributes.role = Array.isArray(names) ? names.join(' ') : names
  }

  // Public: Get the role names for this node as an Array.
  get roles () {
    const val = this.attributes.role
    return val ? val.split(' ') : []
  }

  // Public: Returns whether this AbstractNode is an instance of Block.
  // Subclasses must override this method.
  isBlock () {
    throw new Error('NotImplementedError')
  }

  // Public: Returns whether this AbstractNode is an instance of Inline.
  // Subclasses must override this method.
  isInline () {
    throw new Error('NotImplementedError')
  }

  // Public: Get the converter instance being used to convert the current Document.
  get converter () {
    return this.document.converter
  }

  // Public: Get the value of the specified attribute.
  //
  // Looks for the attribute on this node first. If not found and fallbackName is
  // set (default: same as name), and this node is not the Document node, look for
  // that attribute on the Document node. Otherwise return defaultValue.
  //
  // name         - The String or Symbol name of the attribute to resolve.
  // defaultValue - The value to return if the attribute is not found (default: null).
  // fallbackName - The String/Symbol/true to resolve on the Document when the attribute
  //                is absent on this node (default: null). When true, uses name.
  //
  // Returns the attribute value or defaultValue.
  attr (name, defaultValue = null, fallbackName = null) {
    const key = String(name)
    const val = this.attributes[key]
    if (val != null) return val
    if (fallbackName && this._parent) {
      const fallbackKey = String(fallbackName === true ? name : fallbackName)
      const docVal = this.document.attributes[fallbackKey]
      if (docVal != null) return docVal
    }
    return defaultValue
  }

  // Public: Check if the specified attribute is defined, optionally comparing
  // against an expected value.
  //
  // name          - The String or Symbol name of the attribute to resolve.
  // expectedValue - The expected value of the attribute (default: null).
  //                 When truthy, the method returns whether the resolved value matches.
  // fallbackName  - The String/Symbol/true to resolve on the Document when the
  //                 attribute is absent on this node (default: null).
  //
  // Returns a Boolean.
  hasAttr (name, expectedValue = null, fallbackName = null) {
    const key = String(name)
    if (expectedValue) {
      const val = this.attributes[key] ??
        (fallbackName && this._parent
          ? this.document.attributes[String(fallbackName === true ? name : fallbackName)]
          : null)
      return expectedValue === val
    }
    return key in this.attributes ||
      !!(fallbackName && this._parent &&
        String(fallbackName === true ? name : fallbackName) in this.document.attributes)
  }

  // Public: Get the value of the specified attribute.
  //
  // Returns the attribute value, or undefined when not found.
  getAttribute (name, defaultValue = undefined, inherit = false) {
    const val = this.attr(name, null, inherit || null)
    return val != null ? val : defaultValue
  }

  // Alias for API compatibility: hasAttribute(name, expectedValue, fallbackName)
  hasAttribute (name, expectedValue = null, fallbackName = null) {
    return this.hasAttr(name, expectedValue, fallbackName)
  }

  // Public: Set the value of the specified attribute on this node.
  //
  // name      - The String attribute name.
  // value     - The value to assign (default: '').
  // overwrite - Whether to overwrite an existing attribute (default: true).
  //
  // Returns true if set, false if blocked.
  setAttribute (name, value = '', overwrite = true) {
    return this.setAttr(name, value, overwrite)
  }

  // Public: Check if the specified attribute is defined with an optional value match.
  //
  // name          - The String attribute name.
  // expectedValue - The expected value; when provided, also checks the value (default: null).
  //
  // Returns a Boolean.
  isAttribute (name, expectedValue = null) {
    if (expectedValue != null) return this.getAttribute(name) === expectedValue
    return name in this.attributes
  }

  // Public: Remove the attribute from this node.
  //
  // name - The String attribute name to remove.
  //
  // Returns the previous value, or undefined if not present.
  removeAttribute (name) {
    return this.removeAttr(name)
  }

  // Public: Get the attributes hash for this node.
  //
  // Returns a plain Object of attributes.
  getAttributes () {
    return this.attributes
  }

  // Public: Get the document to which this node belongs.
  //
  // Returns the Document.
  getDocument () {
    return this.document
  }

  // Public: Get the parent node of this node.
  //
  // Returns the parent AbstractNode, or undefined for the root document.
  getParent () {
    return this.parent
  }

  // Public: Get the icon URI for the named icon.
  //
  // name - The String icon name.
  //
  // Returns a String URI.
  getIconUri (name) {
    return this.iconUri(name)
  }

  // Public: Get the media URI for the target.
  //
  // target     - The String target path or URL.
  // assetDirKey - The String asset directory attribute key (default: 'imagesdir').
  //
  // Returns a String URI.
  getMediaUri (target, assetDirKey = 'imagesdir') {
    return this.mediaUri(target, assetDirKey)
  }

  // Public: Get the image URI for the target image.
  //
  // targetImage - The String target image path or URL.
  // assetDirKey - The String asset directory attribute key (default: null).
  //
  // Returns a String URI.
  getImageUri (targetImage, assetDirKey = null) {
    return this.imageUri(targetImage, assetDirKey)
  }

  // Public: Assign the value to the attribute name for the current node.
  //
  // name      - The String attribute name to assign.
  // value     - The value to assign to the attribute (default: '').
  // overwrite - Whether to overwrite an existing attribute (default: true).
  //
  // Returns a Boolean indicating whether the assignment was performed.
  setAttr (name, value = '', overwrite = true) {
    if (overwrite === false && name in this.attributes) return false
    this.attributes[name] = value
    return true
  }

  // Public: Remove the attribute from the current node.
  //
  // name - The String attribute name to remove.
  //
  // Returns the previous value, or undefined if the attribute was not present.
  removeAttr (name) {
    const val = this.attributes[name]
    delete this.attributes[name]
    return val
  }

  // Public: Retrieve the value of the named attribute.
  // Alias for attr() to match the public Ruby API.
  getAttr (name, defaultValue = null, inherit = false) {
    return this.attr(name, defaultValue, inherit || null)
  }

  // Public: Check if the specified option attribute is enabled on this node.
  //
  // name - The String or Symbol name of the option.
  //
  // Returns a Boolean indicating whether the <name>-option attribute is set.
  hasOption (name) {
    return `${name}-option` in this.attributes
  }

  // Public: Set the specified option on this node by setting the <name>-option attribute.
  //
  // name - The String name of the option.
  //
  // Returns undefined.
  setOption (name) {
    this.attributes[`${name}-option`] = ''
  }

  // Public: Retrieve the Set of option names that are enabled on this node.
  //
  // Returns a Set of option name strings.
  enabledOptions () {
    const result = new Set()
    for (const k of Object.keys(this.attributes)) {
      if (k.endsWith('-option')) result.add(k.slice(0, k.length - 7))
    }
    return result
  }

  // Public: Update the attributes of this node with the new values.
  //
  // newAttributes - A plain object of additional attributes to assign.
  //
  // Returns the updated attributes object on this node.
  updateAttributes (newAttributes) {
    return Object.assign(this.attributes, newAttributes)
  }

  // Public: Check if the role attribute is set and, optionally, matches expectedValue.
  //
  // expectedValue - The expected String value of the role (default: null).
  //
  // Returns a Boolean.
  hasRoleAttr (expectedValue = null) {
    if (expectedValue != null) return expectedValue === this.attributes.role
    return 'role' in this.attributes
  }

  // Public: Check if the specified role name is present in this node's role list.
  //
  // name - The String role name to find.
  //
  // Returns a Boolean.
  hasRole (name) {
    const val = this.attributes.role
    return val ? ` ${val} `.includes(` ${name} `) : false
  }

  // Public: Add the given role directly to this node.
  //
  // name - The String role name to add.
  //
  // Returns a Boolean indicating whether the role was added.
  addRole (name) {
    const val = this.attributes.role
    if (val) {
      if (` ${val} `.includes(` ${name} `)) return false
      this.attributes.role = `${val} ${name}`
      return true
    }
    this.attributes.role = name
    return true
  }

  // Public: Remove the given role directly from this node.
  //
  // name - The String role name to remove.
  //
  // Returns a Boolean indicating whether the role was removed.
  removeRole (name) {
    const val = this.attributes.role
    if (!val) return false
    const roles = val.split(' ')
    const idx = roles.indexOf(name)
    if (idx < 0) return false
    roles.splice(idx, 1)
    if (roles.length === 0) {
      delete this.attributes.role
    } else {
      this.attributes.role = roles.join(' ')
    }
    return true
  }

  // Public: Get the value of the reftext attribute with substitutions applied.
  // The result is pre-computed during Document.parse() via precomputeReftext().
  // Falls back to the raw reftext attribute if precomputeReftext() has not been called yet.
  //
  // Returns the String reftext or null if not set.
  get reftext () {
    if (this._convertedReftext !== undefined) return this._convertedReftext
    const val = this.attributes.reftext
    return val ?? null
  }

  // Public: Pre-compute the reftext with substitutions applied asynchronously.
  // Called during Document.parse() so the synchronous getter works during conversion.
  async precomputeReftext () {
    const val = this.attributes.reftext
    this._convertedReftext = val != null ? await this.applyReftextSubs(val) : null
  }

  // Public: Check if the reftext attribute is defined.
  //
  // Returns a Boolean.
  hasReftext () {
    return 'reftext' in this.attributes
  }

  // Public: Construct a reference or data URI to an icon image for the given name.
  //
  // If the 'icon' attribute is set on this node the name is ignored and the
  // attribute value is used as the target path. Otherwise the icon path is built
  // from 'iconsdir', the name, and 'icontype' (default: 'png').
  //
  // name - The String name of the icon.
  //
  // Returns a String reference or data URI for the icon image.
  async iconUri (name) {
    let icon
    if (this.hasAttr('icon')) {
      icon = this.attr('icon')
      if (!isExtname(icon)) icon = `${icon}.${this.document.attr('icontype', 'png')}`
    } else {
      icon = `${name}.${this.document.attr('icontype', 'png')}`
    }
    return this.imageUri(icon, 'iconsdir')
  }

  // Public: Construct a URI reference or data URI to the target image.
  //
  // If the target image is already a URI it is left untouched (unless data-uri
  // conversion is requested). The image is resolved relative to the directory
  // named by assetDirKey. When data-uri is enabled and the safe level permits,
  // the image is embedded as a Base64 data URI.
  //
  // NOTE: When the document has both 'data-uri' and 'allow-uri-read' enabled
  // and the resolved image URL is a remote URI, this method returns a Promise
  // rather than a String. Await the result when that combination may be active.
  //
  // targetImage - A String path to the target image.
  // assetDirKey - The String attribute key for the image directory (default: 'imagesdir').
  //
  // Returns a Promise<String> reference / data URI.
  async imageUri (targetImage, assetDirKey = 'imagesdir') {
    const doc = this.document
    if (doc.safe < SafeMode.SECURE && doc.hasAttr('data-uri')) {
      let imagesBase
      if (
        (isUriish(targetImage) && (targetImage = encodeSpacesInUri(targetImage))) ||
        (assetDirKey &&
          (imagesBase = this.attr(assetDirKey, null, true)) &&
          isUriish(imagesBase) &&
          (targetImage = this.normalizeWebPath(targetImage, imagesBase, false)))
      ) {
        return doc.hasAttr('allow-uri-read')
          ? this.generateDataUriFromUri(targetImage, doc.hasAttr('cache-uri'))
          : targetImage
      }
      return this.generateDataUri(targetImage, assetDirKey)
    }
    return this.normalizeWebPath(targetImage, assetDirKey ? this.attr(assetDirKey, null, true) : null)
  }

  // Public: Construct a URI reference to the target media.
  //
  // target      - A String reference to the target media.
  // assetDirKey - The String attribute key for the media directory (default: 'imagesdir').
  //
  // Returns a String reference for the target media.
  mediaUri (target, assetDirKey = 'imagesdir') {
    return this.normalizeWebPath(target, assetDirKey ? this.attr(assetDirKey, null, true) : null)
  }

  // Public: Generate a data URI that embeds the image at the given local path.
  //
  // The image path is cleaned to prevent access outside the jail when the
  // document safe level is SafeMode.SAFE or higher. The image data is read
  // and Base64-encoded. In non-Node environments this method returns an empty
  // data URI with a warning.
  //
  // targetImage - A String path to the target image.
  // assetDirKey - The String attribute key for the image directory (default: null).
  //
  // Returns a Promise<String> data URI.
  async generateDataUri (targetImage, assetDirKey = null) {
    const ext = extname(targetImage, null)
    const mimetype = ext
      ? (ext === '.svg' ? 'image/svg+xml' : `image/${ext.slice(1)}`)
      : 'application/octet-stream'
    const imagePath = assetDirKey
      ? this.normalizeSystemPath(targetImage, this.attr(assetDirKey, null, true), null, { targetName: 'image' })
      : this.normalizeSystemPath(targetImage)
    if (await isReadable(imagePath)) {
      const data = await _fsp.readFile(imagePath)
      return `data:${mimetype};base64,${data.toString('base64')}`
    }
    this.logger.warn(`image to embed not found or not readable: ${imagePath}`)
    return `data:${mimetype};base64,`
  }

  // Public: Read the image data from the specified URI and generate a data URI.
  //
  // The image data is fetched and Base64-encoded. The MIME type is taken from
  // the Content-Type response header.
  //
  // NOTE: This method is async in JS (the Fetch API is async). When called from
  // imageUri, the caller must await the returned Promise.
  //
  // imageUri - The URI from which to read the image data (http/https/ftp).
  // cacheUri - A Boolean to control caching (not yet supported in JS; default: false).
  //
  // Returns a Promise<String> data URI.
  async generateDataUriFromUri (imageUri, cacheUri = false) { // eslint-disable-line no-unused-vars
    try {
      const response = await fetch(imageUri)
      const mimetype = (response.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim()
      const buffer = await response.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      return `data:${mimetype};base64,${base64}`
    } catch {
      this.logger.warn(`could not retrieve image data from URI: ${imageUri}`)
      return imageUri
    }
  }

  // Public: Normalize the asset file or directory to a concrete and rinsed path.
  //
  // Delegates to normalizeSystemPath with start set to document.baseDir.
  //
  // assetRef   - The String asset reference to normalize.
  // assetName  - The String label for the asset used in messages (default: 'path').
  // autocorrect - A Boolean indicating whether to recover from an illegal path (default: true).
  //
  // Returns the normalized String path.
  normalizeAssetPath (assetRef, assetName = 'path', autocorrect = true) {
    return this.normalizeSystemPath(assetRef, this.document.baseDir, null, { targetName: assetName, recover: autocorrect })
  }

  // Public: Resolve and normalize a secure path from the target and start paths.
  //
  // Prevents resolving a path outside the jail (defaulting to document.baseDir)
  // when the document safe level is SafeMode.SAFE or higher.
  //
  // target - The String target path.
  // start  - The String start (parent) path (default: null).
  // jail   - The String jail path (default: null).
  // opts   - A plain object of options (default: {}):
  //          * recover    - Boolean controlling automatic recovery for illegal paths.
  //          * targetName - String label used in messages for the path being resolved.
  //
  // Throws a SecurityError if a jail is specified and the resolved path is outside it.
  //
  // Returns the resolved String path.
  normalizeSystemPath (target, start = null, jail = null, opts = {}) {
    const doc = this.document
    if (doc.safe < SafeMode.SAFE) {
      if (start) {
        if (!doc.pathResolver.isRoot(start)) start = `${doc.baseDir}/${start}`
      } else {
        start = doc.baseDir
      }
    } else {
      start = start ?? doc.baseDir
      jail = jail ?? doc.baseDir
    }
    return doc.pathResolver.systemPath(target, start, jail, opts)
  }

  // Public: Normalize the web path using the PathResolver.
  //
  // target             - The String target path.
  // start              - The String start (parent) path (default: null).
  // preserveUriTarget - A Boolean indicating whether a URI target should be
  //                     preserved as-is (default: true).
  //
  // Returns the resolved String path.
  normalizeWebPath (target, start = null, preserveUriTarget = true) {
    if (preserveUriTarget && isUriish(target)) return encodeSpacesInUri(target)
    return this.document.pathResolver.webPath(target, start)
  }

  // Public: Read the contents of the file at the specified path.
  //
  // path - The String path from which to read the contents.
  // opts - A plain object of options (default: {}):
  //        * warnOnFailure - Boolean controlling whether a warning is issued
  //                          when the file cannot be read (default: false).
  //        * normalize     - Boolean controlling whether lines are normalized
  //                          and coerced to UTF-8 (default: false).
  //        * label         - String label for the file used in warning messages.
  //
  // Returns a Promise<String|null> — the content of the file, or null if not readable.
  async readAsset (path, opts = {}) {
    // remap opts for backwards compatibility (boolean shorthand)
    if (typeof opts !== 'object' || opts === null) opts = { warnOnFailure: opts !== false }
    if (await isReadable(path)) {
      if (opts.normalize) {
        return prepareSourceString(await _fsp.readFile(path, 'utf8')).join(LF)
      }
      return _fsp.readFile(path, 'utf8')
    }
    if (opts.warnOnFailure) {
      const docfile = this.attr('docfile') || '<stdin>'
      const label = opts.label || 'file'
      this.logger.warn(`${docfile}: ${label} does not exist or cannot be read: ${path}`)
    }
    return null
  }

  // Public: Resolve the URI or system path to the target, then read and return its contents.
  //
  // When the resolved path is a URI and allow-uri-read is enabled, the content is
  // fetched via the Fetch API (async). When it is a local path, the file is read
  // synchronously via readAsset.
  //
  // target - The URI or local path String from which to read the data.
  // opts   - A plain object of options (default: {}):
  //          * label         - String label used in warning messages (default: 'asset').
  //          * normalize     - Boolean indicating whether the data should be
  //                            normalized (default: false).
  //          * start         - String relative base path for resolving the target.
  //          * warnOnFailure - Boolean indicating whether warnings are issued on
  //                            failure (default: true).
  //          * warnIfEmpty   - Boolean indicating whether a warning is issued when
  //                            the target contents are empty (default: false).
  //
  // Returns a Promise<String|null> when the target is a URI, or String|null when local.
  async readContents (target, opts = {}) {
    const doc = this.document
    const label = opts.label || 'asset'
    let contents
    let resolvedTarget = target
    const start = opts.start
    const warnOnFailure = opts.warnOnFailure !== false

    if (isUriish(target) || (start && isUriish(start) && (resolvedTarget = doc.pathResolver.webPath(target, start)))) {
      if (doc.hasAttr('allow-uri-read')) {
        try {
          const response = await fetch(resolvedTarget)
          const text = await response.text()
          contents = opts.normalize ? prepareSourceString(text).join(LF) : text
        } catch {
          if (warnOnFailure) this.logger.warn(`could not retrieve contents of ${label} at URI: ${resolvedTarget}`)
        }
      } else if (warnOnFailure) {
        this.logger.warn(`cannot retrieve contents of ${label} at URI: ${resolvedTarget} (allow-uri-read attribute not enabled)`)
      }
    } else {
      resolvedTarget = this.normalizeSystemPath(target, opts.start, null, { targetName: label })
      contents = await this.readAsset(resolvedTarget, { normalize: opts.normalize, warnOnFailure, label })
    }

    if (contents && opts.warnIfEmpty && contents.length === 0) {
      this.logger.warn(`contents of ${label} is empty: ${resolvedTarget}`)
    }
    return contents
  }

  // Deprecated: Check whether the specified String is a URI.
  //
  // @deprecated Use isUriish() from helpers.js instead.
  isUri (str) {
    return isUriish(str)
  }

  // Internal: Provide a default logger.
  // The Logging mixin (logging.js) overrides this getter on the prototype.
  get logger () {
    return this.document?.logger ?? console
  }
}