// ESM conversion of abstract_node.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby symbols (:document, :context) are represented as plain strings.
//   - attr_reader / attr_accessor are implemented as plain instance properties;
//     cases where the setter has side effects use JS get/set pairs.
//   - Ruby methods ending in ? are renamed: attr? → hasAttr, block? → isBlock,
//     inline? → isInline, role? → hasRoleAttribute, has_role? → hasRole,
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
//     When the resolved path is an HTTP URI (browser: docdir is a URL), readAsset
//     delegates to browser/asset.js (Fetch API) instead of using the filesystem.
//   - generateDataUriFromUri and readContents use the Fetch API and are async;
//     imageUri and readContents must be awaited when the data-uri + allow-uri-read
//     combination is active.
//   - Ruby's Set is represented as a JavaScript Set.

import { SafeMode, LF } from './constants.js'
import {
  isUriish,
  encodeSpacesInUri,
  isExtname,
  extname,
  prepareSourceString,
} from './helpers.js'

// ── Node.js fs (lazy, optional) ───────────────────────────────────────────────
// Loaded on first use in Node.js; silently absent in browser/WebWorker environments.
let _fsp // undefined = not tried, null = unavailable, object = available
let _fsConstants // node:fs constants (R_OK etc.) — not on node:fs/promises

async function _requireFsp() {
  if (_fsp !== undefined) return
  try {
    _fsp = await import('node:fs/promises')
    _fsConstants = (await import('node:fs')).constants
  } catch {
    _fsp = null
  }
}

async function isReadable(path) {
  await _requireFsp()
  if (!_fsp) return false
  try {
    await _fsp.access(path, _fsConstants.R_OK)
    return true
  } catch {
    return false
  }
}

/**
 * An abstract base class that provides state and methods for managing a node of AsciiDoc content.
 * The state and methods on this class are common to all content segments in an AsciiDoc document.
 * @abstract
 */
export class AbstractNode {
  /**
   * @type {string|null|undefined}
   * @internal
   */
  _convertedReftext

  /**
   * @param {AbstractNode} parent
   * @param {string} context
   * @param {object} [opts={}]
   */
  constructor(parent, context, opts = {}) {
    // document is a special case – should refer to itself
    if (context === 'document') {
      /** @type {Document} */
      this.document = /** @type {Document} */ this
    } else if (parent) {
      /** @internal */
      this._parent = parent
      /** @type {Document} */
      this.document = parent.document
    }
    this.context = context
    this.nodeName = String(context)
    this.id = null
    // NOTE the value of the attributes option may be undefined on an Inline node
    const attrs = opts.attributes
    this.attributes = attrs ? { ...attrs } : {}
    this.passthroughs = []
  }

  /**
   * Alias for {@link getParent}.
   * @see {getParent}
   */
  get parent() {
    return this._parent
  }

  /**
   * Alias for {@link setParent}.
   * @see {setParent}
   */
  set parent(parent) {
    this._parent = parent
    this.document = parent.document
  }

  /**
   * Alias for {@link getRole}.
   * @see {getRole}
   */
  get role() {
    return this.attributes.role
  }

  /**
   * Set the value of the role attribute on this node.
   *
   * Accepts a single role name, a space-separated String, or an Array.
   *
   * @param {string|string[]} names - A single role name, a space-separated String, or an Array.
   */
  set role(names) {
    this.attributes.role = Array.isArray(names) ? names.join(' ') : names
  }

  /**
   * Alias for {@link getRoles}.
   * @see {getRoles}
   */
  get roles() {
    const val = this.attributes.role
    return val ? val.split(' ') : []
  }

  /**
   * @returns {boolean} true if this AbstractNode is an instance of Block.
   * @throws {Error} Subclasses must override this method.
   */
  isBlock() {
    throw new Error('NotImplementedError')
  }

  /**
   * @returns {boolean} true if this AbstractNode is an instance of Inline.
   * @throws {Error} Subclasses must override this method.
   */
  isInline() {
    throw new Error('NotImplementedError')
  }

  /**
   * Alias for {@link getConverter}.
   * @see {getConverter}
   * @returns {object} the converter instance.
   */
  get converter() {
    return this.document.converter
  }

  /**
   * Get the value of the specified attribute.
   *
   * Looks for the attribute on this node first. If not found and `fallbackName` is
   * set, and this node is not the Document node, look for that attribute on the
   * Document node. Otherwise, return `defaultValue`.
   *
   * @param {string} name - The attribute name to resolve.
   * @param {*} [defaultValue=null] - The value to return if the attribute is not found.
   * @param {string|boolean|null} [fallbackName=null] - When truthy, also checks the Document's
   *   attributes. Pass `true` to fall back using the same name, or a string to use a different name.
   * @returns {*} the attribute value or defaultValue.
   *
   * @example <caption>Simple lookup</caption>
   * block.getAttribute('language')           // → 'ruby' or null
   *
   * @example <caption>With default</caption>
   * block.getAttribute('linenums', false)    // → false if not set
   *
   * @example <caption>Inherit from document if absent on block</caption>
   * block.getAttribute('source-highlighter', null, true)    // → falls back to doc attribute of same name
   * block.getAttribute('linenums', null, 'source-linenums') // → falls back to 'source-linenums' on doc
   */
  getAttribute(name, defaultValue = null, fallbackName = null) {
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

  /**
   * Check if the specified attribute is defined on this node, with optional
   * value match and document-level fallback.
   *
   * @param {string} name - The attribute name.
   * @param {*} [expectedValue=null] - When truthy, also checks that the resolved value equals this.
   * @param {string|boolean|null} [fallbackName=null] - When truthy, also checks the Document's
   *   attributes. Pass `true` to use the same name, or a string for a different fallback name.
   * @returns {boolean}
   *
   * @example <caption>Presence check</caption>
   * block.hasAttribute('linenums')                       // → true/false
   *
   * @example <caption>Value match</caption>
   * block.hasAttribute('language', 'ruby')               // → true only when language === 'ruby'
   *
   * @example <caption>Inherit presence from document</caption>
   * block.hasAttribute('source-highlighter', null, true) // → also checks doc-level attribute
   */
  hasAttribute(name, expectedValue = null, fallbackName = null) {
    const key = String(name)
    if (expectedValue) {
      const val =
        this.attributes[key] ??
        (fallbackName && this._parent
          ? this.document.attributes[
              String(fallbackName === true ? name : fallbackName)
            ]
          : null)
      return expectedValue === val
    }
    return (
      key in this.attributes ||
      !!(
        fallbackName &&
        this._parent &&
        String(fallbackName === true ? name : fallbackName) in
          this.document.attributes
      )
    )
  }

  /**
   * Set the value of the specified attribute on this node.
   *
   * @param {string} name - The attribute name to assign.
   * @param {*} [value=''] - The value to assign.
   * @param {boolean} [overwrite=true] - When `false`, does nothing if the attribute already exists.
   * @returns {string|boolean|null} `true` if the attribute was set, `false` if blocked by `overwrite=false`.
   *   Subclasses (e.g. `Document`) may return the resolved value string or `null` when the attribute is locked.
   */
  setAttribute(name, value = '', overwrite = true) {
    if (overwrite === false && name in this.attributes) return false
    this.attributes[name] = value
    return true
  }

  /**
   * Check if the specified attribute is defined with an optional value match.
   * Alias for {@link hasAttribute}.
   * @see {hasAttribute}
   */
  isAttribute(name, expectedValue = null) {
    if (expectedValue != null) return this.getAttribute(name) === expectedValue
    return name in this.attributes
  }

  /**
   * Remove the attribute from this node.
   *
   * @param {string} name - The attribute name to remove.
   * @returns {*} the previous value, or `undefined` if the attribute was not present.
   */
  removeAttribute(name) {
    const val = this.attributes[name]
    delete this.attributes[name]
    return val
  }

  /**
   * Check if the specified option attribute is enabled on this node.
   * This method checks whether the `<name>-option` attribute is set.
   *
   * @param {string} name - The String or Symbol name of the option.
   * @returns {boolean} true if the option is enabled, false otherwise.
   */
  hasOption(name) {
    return `${name}-option` in this.attributes
  }

  /**
   * Set the specified option on this node by setting the `<name>-option` attribute.
   *
   * @param {string} name - The String name of the option.
   */
  setOption(name) {
    this.attributes[`${name}-option`] = ''
  }

  /**
   * Retrieve the Set of option names that are enabled on this node.
   *
   * @returns {Set<string>} a Set of option name strings.
   */
  enabledOptions() {
    const result = new Set()
    for (const k of Object.keys(this.attributes)) {
      if (k.endsWith('-option')) result.add(k.slice(0, k.length - 7))
    }
    return result
  }

  /**
   * Update the attributes of this node with the new values.
   *
   * @param {Object} newAttributes - A plain object of additional attributes to assign.
   * @returns {Object} the updated attributes object on this node.
   */
  updateAttributes(newAttributes) {
    return Object.assign(this.attributes, newAttributes)
  }

  /**
   * Check if the `role` attribute is set on this node, optionally matching an exact value.
   *
   * Unlike {@link hasRole}, which checks for an individual role name within a
   * space-separated list, this method tests the raw `role` attribute string as a whole.
   *
   * @param {string|null} [expectedValue=null] - When provided, checks that the `role`
   *   attribute equals this string exactly.
   * @returns {boolean}
   *
   * @example
   * node.hasRoleAttribute()         // → true if role attribute is set at all
   * node.hasRoleAttribute('lead')   // → true only when role === 'lead' (not 'lead primary')
   */
  hasRoleAttribute(expectedValue = null) {
    if (expectedValue != null) return expectedValue === this.attributes.role
    return 'role' in this.attributes
  }

  /**
   * Check if the specified role name is present in this node's role list.
   *
   * @param {string} name - The String role name to find.
   * @returns {boolean}
   */
  hasRole(name) {
    const val = this.attributes.role
    return val ? ` ${val} `.includes(` ${name} `) : false
  }

  /**
   * Add the given role directly to this node.
   *
   * @param {string} name - The String role name to add.
   * @returns {boolean} true if the role was added, false if it was already present.
   */
  addRole(name) {
    const val = this.attributes.role
    if (val) {
      if (` ${val} `.includes(` ${name} `)) return false
      this.attributes.role = `${val} ${name}`
      return true
    }
    this.attributes.role = name
    return true
  }

  /**
   * Remove the given role directly from this node.
   *
   * @param {string} name - The String role name to remove.
   * @returns {boolean} true if the role was removed, false if it was not present.
   */
  removeRole(name) {
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

  /**
   * Get the value of the reftext attribute with substitutions applied.
   * The result is pre-computed during Document.parse() via {@link precomputeReftext}.
   * Falls back to the raw reftext attribute if precomputeReftext() has not been called yet.
   *
   * @returns {string|null} the String reftext or null if not set.
   */
  get reftext() {
    if (this._convertedReftext !== undefined) return this._convertedReftext
    const val = this.attributes.reftext
    return val ?? null
  }

  /**
   * Pre-compute the reftext with substitutions applied asynchronously.
   * Called during Document.parse() so the synchronous getter works during conversion.
   *
   * @returns {Promise<void>}
   */
  async precomputeReftext() {
    const val = this.attributes.reftext
    this._convertedReftext =
      val != null ? await this.applyReftextSubs(val) : null
  }

  /**
   * Check if the reftext attribute is defined.
   *
   * @returns {boolean}
   */
  hasReftext() {
    return 'reftext' in this.attributes
  }

  /**
   * Check whether this node has reftext — either an explicit 'reftext' attribute
   * or a title that can serve as the cross-reference text.
   * Mirrors Ruby's AbstractNode#reftext?
   * @returns {boolean}
   */
  isReftext() {
    return this.hasAttribute('reftext') || !!this.title
  }

  /**
   * Construct a reference or data URI to an icon image for the given name.
   *
   * If the 'icon' attribute is set on this node the name is ignored and the
   * attribute value is used as the target path. Otherwise the icon path is built
   * from 'iconsdir', the name, and 'icontype' (default: 'png').
   *
   * @param {string} name - The String name of the icon.
   * @returns {Promise<string>} a Promise resolving to a String reference or data URI for the icon image.
   */
  async iconUri(name) {
    let icon
    if (this.hasAttribute('icon')) {
      icon = this.getAttribute('icon')
      if (!isExtname(icon))
        icon = `${icon}.${this.document.getAttribute('icontype', 'png')}`
    } else {
      icon = `${name}.${this.document.getAttribute('icontype', 'png')}`
    }
    return this.imageUri(icon, 'iconsdir')
  }

  /**
   * Construct a URI reference or data URI to the target image.
   *
   * If the target image is already a URI it is left untouched (unless data-uri
   * conversion is requested). The image is resolved relative to the directory
   * named by assetDirKey. When data-uri is enabled and the safe level permits,
   * the image is embedded as a Base64 data URI.
   *
   * NOTE: When the document has both 'data-uri' and 'allow-uri-read' enabled
   * and the resolved image URL is a remote URI, this method returns a Promise
   * rather than a String. Await the result when that combination may be active.
   *
   * @param {string} targetImage - A String path to the target image.
   * @param {string} [assetDirKey='imagesdir'] - The String attribute key for the image directory.
   * @returns {Promise<string>} a Promise resolving to a String reference or data URI.
   */
  async imageUri(targetImage, assetDirKey = 'imagesdir') {
    const doc = this.document
    if (doc.safe < SafeMode.SECURE && doc.hasAttribute('data-uri')) {
      let imagesBase
      if (
        (isUriish(targetImage) &&
          (targetImage = encodeSpacesInUri(targetImage))) ||
        (assetDirKey &&
          (imagesBase = this.getAttribute(assetDirKey, null, true)) &&
          isUriish(imagesBase) &&
          (targetImage = this.normalizeWebPath(targetImage, imagesBase, false)))
      ) {
        return doc.hasAttribute('allow-uri-read')
          ? this.generateDataUriFromUri(
              targetImage,
              doc.hasAttribute('cache-uri')
            )
          : targetImage
      }
      return this.generateDataUri(targetImage, assetDirKey)
    }
    return this.normalizeWebPath(
      targetImage,
      assetDirKey ? this.getAttribute(assetDirKey, null, true) : null
    )
  }

  /**
   * Construct a URI reference to the target media.
   *
   * @param {string} target - A String reference to the target media.
   * @param {string} [assetDirKey='imagesdir'] - The String attribute key for the media directory.
   * @returns {string} a String reference for the target media.
   */
  mediaUri(target, assetDirKey = 'imagesdir') {
    return this.normalizeWebPath(
      target,
      assetDirKey ? this.getAttribute(assetDirKey, null, true) : null
    )
  }

  /**
   * Generate a data URI that embeds the image at the given local path.
   *
   * The image path is cleaned to prevent access outside the jail when the
   * document safe level is SafeMode.SAFE or higher. The image data is read
   * and Base64-encoded. In non-Node environments this method returns an empty
   * data URI with a warning.
   *
   * @param {string} targetImage - A String path to the target image.
   * @param {string|null} [assetDirKey=null] - The String attribute key for the image directory.
   * @returns {Promise<string>} a Promise resolving to a String data URI.
   */
  async generateDataUri(targetImage, assetDirKey = null) {
    const ext = extname(targetImage, null)
    const mimetype = ext
      ? ext === '.svg'
        ? 'image/svg+xml'
        : `image/${ext.slice(1)}`
      : 'application/octet-stream'
    const imagePath = assetDirKey
      ? this.normalizeSystemPath(
          targetImage,
          this.getAttribute(assetDirKey, null, true),
          null,
          { targetName: 'image' }
        )
      : this.normalizeSystemPath(targetImage)
    if (isUriish(imagePath)) {
      return await this.generateDataUriFromUri(
        imagePath,
        this.document.hasAttribute('cache-uri')
      )
    }
    if (await isReadable(imagePath)) {
      const data = await _fsp.readFile(imagePath)
      return `data:${mimetype};base64,${data.toString('base64')}`
    }
    this.logger.warn(`image to embed not found or not readable: ${imagePath}`)
    return `data:${mimetype};base64,`
  }

  /**
   * Read the image data from the specified URI and generate a data URI.
   *
   * The image data is fetched and Base64-encoded. The MIME type is taken from
   * the Content-Type response header.
   *
   * NOTE: This method is async in JS (the Fetch API is async). When called from
   * imageUri, the caller must await the returned Promise.
   *
   * @param {string} imageUri - The URI from which to read the image data (http/https/ftp).
   * @param {boolean} [cacheUri=false] - A Boolean to control caching (not yet supported in JS).
   * @returns {Promise<string>} a Promise resolving to a String data URI.
   */
  async generateDataUriFromUri(imageUri, cacheUri = false) {
    // eslint-disable-line no-unused-vars
    try {
      const response = await fetch(imageUri)
      if (response.ok) {
        const mimetype = (
          response.headers.get('content-type') || 'application/octet-stream'
        )
          .split(';')[0]
          .trim()
        const buffer = await response.arrayBuffer()
        const base64 = btoa(
          Array.from(new Uint8Array(buffer), (b) =>
            String.fromCharCode(b)
          ).join('')
        )
        return `data:${mimetype};base64,${base64}`
      } else {
        const ext = extname(imageUri, null)
        const mimetype = ext
          ? ext === '.svg'
            ? 'image/svg+xml'
            : `image/${ext.slice(1)}`
          : 'application/octet-stream'
        this.logger.warn(
          `image to embed not found or not readable: ${imageUri}`
        )
        return `data:${mimetype};base64,`
      }
    } catch {
      this.logger.warn(`could not retrieve image data from URI: ${imageUri}`)
      return imageUri
    }
  }

  /**
   * Normalize the asset file or directory to a concrete and rinsed path.
   *
   * Delegates to {@link normalizeSystemPath} with start set to document.baseDir.
   *
   * @param {string} assetRef - The String asset reference to normalize.
   * @param {string} [assetName='path'] - The String label for the asset used in messages.
   * @param {boolean} [autocorrect=true] - A Boolean indicating whether to recover from an illegal path.
   * @returns {string} the normalized String path.
   */
  normalizeAssetPath(assetRef, assetName = 'path', autocorrect = true) {
    return this.normalizeSystemPath(assetRef, this.document.baseDir, null, {
      targetName: assetName,
      recover: autocorrect,
    })
  }

  /**
   * Resolve and normalize a secure path from the target and start paths.
   *
   * Prevents resolving a path outside the jail (defaulting to document.baseDir)
   * when the document safe level is SafeMode.SAFE or higher.
   *
   * @param {string} target - The String target path.
   * @param {string|null} [start=null] - The String start (parent) path.
   * @param {string|null} [jail=null] - The String jail path.
   * @param {Object} [opts={}] - A plain object of options:
   *   - `recover` {boolean} - Whether to automatically recover for illegal paths.
   *   - `targetName` {string} - Label used in messages for the path being resolved.
   * @throws {Error} if a jail is specified and the resolved path is outside it.
   * @returns {string} the resolved String path.
   */
  normalizeSystemPath(target, start = null, jail = null, opts = {}) {
    const doc = this.document
    if (doc.safe < SafeMode.SAFE) {
      if (start) {
        if (!doc.pathResolver.root(start)) start = `${doc.baseDir}/${start}`
      } else {
        start = doc.baseDir
      }
    } else {
      start = start ?? doc.baseDir
      jail = jail ?? doc.baseDir
    }
    return doc.pathResolver.systemPath(target, start, jail, opts)
  }

  /**
   * Normalize the web path using the PathResolver.
   *
   * @param {string} target - The String target path.
   * @param {string|null} [start=null] - The String start (parent) path.
   * @param {boolean} [preserveUriTarget=true] - Whether a URI target should be preserved as-is.
   * @returns {string} the resolved String path.
   */
  normalizeWebPath(target, start = null, preserveUriTarget = true) {
    if (preserveUriTarget && isUriish(target)) return encodeSpacesInUri(target)
    return this.document.pathResolver.webPath(target, start)
  }

  /**
   * Read the contents of the file at the specified path.
   *
   * This method checks that the file is readable before attempting to read it.
   *
   * @param {string} path - The String path from which to read the contents.
   * @param {Object} [opts={}] - A plain object of options:
   *   - `warnOnFailure` {boolean} - Whether a warning is issued when the file cannot be read (default: false).
   *   - `normalize` {boolean} - Whether lines are normalized and coerced to UTF-8 (default: false).
   *   - `label` {string} - Label for the file used in warning messages.
   * @returns {Promise<string|null>} a Promise resolving to the file content, or null if not readable.
   */
  async readAsset(path, opts = {}) {
    // remap opts for backwards compatibility (boolean shorthand)
    if (typeof opts !== 'object' || opts === null)
      opts = { warnOnFailure: opts !== false }
    if (isUriish(path)) {
      // Browser: docdir is a URL so the resolved path is an HTTP URI; use fetch instead of fs.
      const { readBrowserAsset } = await import('./browser/asset.js')
      const text = await readBrowserAsset(path)
      if (text != null)
        return opts.normalize ? prepareSourceString(text).join(LF) : text
      if (opts.warnOnFailure) {
        const docfile = this.getAttribute('docfile') || '<stdin>'
        const label = opts.label || 'file'
        this.logger.warn(
          `${docfile}: ${label} does not exist or cannot be read: ${path}`
        )
      }
      return null
    }
    if (await isReadable(path)) {
      if (opts.normalize) {
        return prepareSourceString(await _fsp.readFile(path, 'utf8')).join(LF)
      }
      return _fsp.readFile(path, 'utf8')
    }
    if (opts.warnOnFailure) {
      const docfile = this.getAttribute('docfile') || '<stdin>'
      const label = opts.label || 'file'
      this.logger.warn(
        `${docfile}: ${label} does not exist or cannot be read: ${path}`
      )
    }
    return null
  }

  /**
   * Resolve the URI or system path to the target, then read and return its contents.
   *
   * When the resolved path is a URI and allow-uri-read is enabled, the content is
   * fetched via the Fetch API (async). When it is a local path, the file is read
   * via {@link readAsset}.
   *
   * @param {string} target - The URI or local path String from which to read the data.
   * @param {Object} [opts={}] - A plain object of options:
   *   - `label` {string} - Label used in warning messages (default: 'asset').
   *   - `normalize` {boolean} - Whether the data should be normalized (default: false).
   *   - `start` {string} - Relative base path for resolving the target.
   *   - `warnOnFailure` {boolean} - Whether warnings are issued on failure (default: true).
   *   - `warnIfEmpty` {boolean} - Whether a warning is issued when the target contents are empty (default: false).
   * @returns {Promise<string|null>} a Promise resolving to the content, or null on failure.
   */
  async readContents(target, opts = {}) {
    const doc = this.document
    const label = opts.label || 'asset'
    let contents
    let resolvedTarget = target
    const start = opts.start
    const warnOnFailure = opts.warnOnFailure !== false

    if (
      isUriish(target) ||
      (start &&
        isUriish(start) &&
        (resolvedTarget = doc.pathResolver.webPath(target, start)))
    ) {
      if (doc.hasAttribute('allow-uri-read')) {
        try {
          const response = await fetch(resolvedTarget)
          const text = await response.text()
          contents = opts.normalize ? prepareSourceString(text).join(LF) : text
        } catch {
          if (warnOnFailure)
            this.logger.warn(
              `could not retrieve contents of ${label} at URI: ${resolvedTarget}`
            )
        }
      } else if (warnOnFailure) {
        this.logger.warn(
          `cannot retrieve contents of ${label} at URI: ${resolvedTarget} (allow-uri-read attribute not enabled)`
        )
      }
    } else {
      resolvedTarget = this.normalizeSystemPath(target, opts.start, null, {
        targetName: label,
      })
      contents = await this.readAsset(resolvedTarget, {
        normalize: opts.normalize,
        warnOnFailure,
        label,
      })
    }

    if (contents && opts.warnIfEmpty && contents.length === 0) {
      this.logger.warn(`contents of ${label} is empty: ${resolvedTarget}`)
    }
    return contents
  }

  /**
   * @deprecated Use `isUriish` from helpers.js instead.
   * @param {string} str
   * @returns {boolean}
   */
  isUri(str) {
    return isUriish(str)
  }

  /**
   * Provide a default logger.
   * The Logging mixin (logging.js) overrides this getter on the prototype.
   */
  get logger() {
    return this.document?.logger ?? console
  }

  // ── JavaScript-style accessors ────────────────────────────────────────────────

  /**
   * Get the logger for this node.
   * @returns {object} the logger instance.
   */
  getLogger() {
    return this.logger
  }

  /**
   * Retrieve the space-separated String role for this node.
   *
   * @returns {string|undefined} the role as a space-separated String.
   */
  getRole() {
    return this.role
  }

  /**
   * Set the value of the role attribute on this node.
   *
   * Accepts a single role name, a space-separated String, an Array, or spread arguments.
   *
   * @param {...string|string[]} names - A single role name, a space-separated String, an Array,
   *   or multiple role names as spread arguments.
   * @returns {string} the value of the role attribute.
   */
  setRole(...names) {
    this.role = names.length === 1 ? names[0] : names
    return this.attributes.role
  }

  /**
   * Retrieve the String role names for this node as an Array.
   *
   * @returns {string[]} the role names as a String Array, empty if the role attribute is absent.
   */
  getRoles() {
    return this.roles
  }

  /**
   * Get the attributes hash for this node.
   *
   * @returns {Object} a plain Object of attributes.
   */
  getAttributes() {
    return this.attributes
  }

  /**
   * Get the document to which this node belongs.
   *
   * @returns {Document} the Document.
   */
  getDocument() {
    return this.document
  }

  /**
   * Get the parent node of this node.
   *
   * @returns {AbstractNode|undefined} the parent AbstractNode, or undefined for the root document.
   */
  getParent() {
    return this._parent
  }

  /**
   * Set the parent of this node.
   * Also updates the document reference.
   */
  setParent(parent) {
    this._parent = parent
    this.document = parent.document
  }

  /**
   * Get the String name of this node.
   *
   * @returns {string} the node name.
   */
  getNodeName() {
    return this.nodeName
  }

  /**
   * Get the String id for this node.
   *
   * @returns {string|undefined} the id, or undefined if not set.
   */
  getId() {
    return this.id ?? undefined
  }

  /**
   * Set the String id for this node.
   *
   * @param {string} id - The String id to assign.
   */
  setId(id) {
    this.id = id
  }

  /**
   * Get the context name for this node.
   *
   * @returns {string} the context name.
   */
  getContext() {
    return this.context
  }

  /**
   * Get the {Converter} instance being used to convert the current {Document}.
   *
   * @returns {object} the converter instance.
   */
  getConverter() {
    return this.converter
  }

  /**
   * Get the icon URI for the named icon.
   *
   * @param {string} name - The String icon name.
   * @returns {Promise<string>} a Promise resolving to a String URI.
   */
  getIconUri(name) {
    return this.iconUri(name)
  }

  /**
   * Get the media URI for the target.
   *
   * @param {string} target - The String target path or URL.
   * @param {string} [assetDirKey='imagesdir'] - The String asset directory attribute key.
   * @returns {string} a String URI.
   */
  getMediaUri(target, assetDirKey = 'imagesdir') {
    return this.mediaUri(target, assetDirKey)
  }

  /**
   * Get the image URI for the target image.
   *
   * @param {string} targetImage - The String target image path or URL.
   * @param {string|null} [assetDirKey=null] - The String asset directory attribute key.
   * @returns {Promise<string>} a Promise resolving to a String URI.
   */
  getImageUri(targetImage, assetDirKey = null) {
    return this.imageUri(targetImage, assetDirKey)
  }

  /**
   * Get the value of the reftext attribute with substitutions applied.
   *
   * @returns {string|undefined} the reftext value, or undefined if not set.
   */
  getReftext() {
    return this.reftext ?? undefined
  }
}
