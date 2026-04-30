/**
 * An abstract base class that provides state and methods for managing a node of AsciiDoc content.
 * The state and methods on this class are common to all content segments in an AsciiDoc document.
 * @abstract
 */
export abstract class AbstractNode {
    /**
     * @param {AbstractNode} parent
     * @param {string} context
     * @param {object} [opts={}]
     */
    constructor(parent: AbstractNode, context: string, opts?: object);
    /** @type {Document} */
    document: Document;
    context: string;
    nodeName: string;
    id: string;
    attributes: any;
    passthroughs: any[];
    /**
     * Set the parent of this node.
     * Also updates the document reference.
     */
    set parent(parent: any);
    /**
     * Set the value of the role attribute on this node.
     *
     * Accepts a single role name, a space-separated String, or an Array.
     *
     * @param {string|string[]} names - A single role name, a space-separated String, or an Array.
     */
    set role(names: string | string[]);
    /**
     * Get the space-separated role string for this node.
     *
     * @returns {string|undefined} the role as a space-separated String.
     */
    get role(): string | undefined;
    /**
     * Retrieve the String role names for this node as an Array.
     *
     * @returns {string[]} the role names as a String Array, empty if the role attribute is absent.
     */
    get roles(): string[];
    /**
     * Retrieve the space-separated String role for this node.
     *
     * @returns {string|undefined} the role as a space-separated String.
     */
    getRole(): string | undefined;
    /**
     * Set the value of the role attribute on this node.
     *
     * Accepts a single role name, a space-separated String, an Array, or spread arguments.
     *
     * @param {...string|string[]} names - A single role name, a space-separated String, an Array,
     *   or multiple role names as spread arguments.
     * @returns {string} the value of the role attribute.
     */
    setRole(...names: (string | string[])[]): string;
    /**
     * Retrieve the String role names for this node as an Array.
     *
     * @returns {string[]} the role names as a String Array, empty if the role attribute is absent.
     */
    getRoles(): string[];
    /**
     * @returns {boolean} true if this AbstractNode is an instance of Block.
     * @throws {Error} Subclasses must override this method.
     */
    isBlock(): boolean;
    /**
     * @returns {boolean} true if this AbstractNode is an instance of Inline.
     * @throws {Error} Subclasses must override this method.
     */
    isInline(): boolean;
    /**
     * Get the converter instance being used to convert the current Document.
     */
    get converter(): any;
    /**
     * Get the String name of this node.
     *
     * @returns {string} the node name.
     */
    getNodeName(): string;
    /**
     * Get the String id for this node.
     *
     * @returns {string|undefined} the id, or undefined if not set.
     */
    getId(): string | undefined;
    /**
     * Set the String id for this node.
     *
     * @param {string} id - The String id to assign.
     */
    setId(id: string): void;
    /**
     * Get the context name for this node.
     *
     * @returns {string} the context name.
     */
    getContext(): string;
    /**
     * Get the {Converter} instance being used to convert the current {Document}.
     *
     * @returns {object} the converter instance.
     */
    getConverter(): object;
    /**
     * Get the value of the specified attribute.
     *
     * Looks for the attribute on this node first. If not found and fallbackName is
     * set (default: same as name), and this node is not the Document node, look for
     * that attribute on the Document node. Otherwise return defaultValue.
     *
     * @param {string} name - The String or Symbol name of the attribute to resolve.
     * @param {*} [defaultValue=null] - The value to return if the attribute is not found.
     * @param {string|boolean|null} [fallbackName=null] - The String/Symbol/true to resolve on the
     *   Document when the attribute is absent on this node. When true, uses name.
     * @returns {*} the attribute value or defaultValue.
     */
    attr(name: string, defaultValue?: any, fallbackName?: string | boolean | null): any;
    /**
     * Check if the specified attribute is defined, optionally comparing against an expected value.
     *
     * @param {string} name - The String or Symbol name of the attribute to resolve.
     * @param {*} [expectedValue=null] - The expected value of the attribute.
     *   When truthy, the method returns whether the resolved value matches.
     * @param {string|boolean|null} [fallbackName=null] - The String/Symbol/true to resolve on the
     *   Document when the attribute is absent on this node.
     * @returns {boolean}
     */
    hasAttr(name: string, expectedValue?: any, fallbackName?: string | boolean | null): boolean;
    /**
     * Get the value of the specified attribute.
     *
     * If the attribute is not found on this node, fallbackName is set, and this node is not
     * the Document node, get the value of the specified attribute from the Document node.
     *
     * @param {string} name - The String name of the attribute to resolve.
     * @param {*} [defaultValue=undefined] - The value to return if the attribute is not found.
     * @param {string|boolean} [inherit=false] - The String of the attribute to resolve on the
     *   Document if the attribute is not found on this node (default: same as name).
     * @returns {*} the attribute value, or defaultValue if the attribute is not found.
     */
    getAttribute(name: string, defaultValue?: any, inherit?: string | boolean): any;
    /**
     * Check whether the specified attribute is present on this node.
     * Alias for {@link hasAttr} for API compatibility.
     *
     * @param {string} name - The String name of the attribute to resolve.
     * @param {*} [expectedValue=null] - The expected value of the attribute.
     * @param {string|boolean|null} [fallbackName=null] - The fallback attribute name on the Document.
     * @returns {boolean}
     */
    hasAttribute(name: string, expectedValue?: any, fallbackName?: string | boolean | null): boolean;
    /**
     * Set the value of the specified attribute on this node.
     *
     * @param {string} name - The String attribute name to assign.
     * @param {*} [value=''] - The value to assign to the attribute.
     * @param {boolean} [overwrite=true] - Whether to overwrite an existing attribute.
     * @returns {string|boolean|null} true/false in the base class; subclasses (e.g. Document) may return the resolved value string or null.
     */
    setAttribute(name: string, value?: any, overwrite?: boolean): string | boolean | null;
    /**
     * Check if the specified attribute is defined with an optional value match.
     *
     * Equivalent to {@link getAttribute}, but returns a Boolean rather than the value.
     *
     * @param {string} name - The String attribute name.
     * @param {*} [expectedValue=null] - The expected value; when provided, also checks the value.
     * @returns {boolean}
     */
    isAttribute(name: string, expectedValue?: any): boolean;
    /**
     * Remove the attribute from this node.
     *
     * @param {string} name - The String attribute name to remove.
     * @returns {*} the previous value, or undefined if not present.
     */
    removeAttribute(name: string): any;
    /**
     * Get the attributes hash for this node.
     *
     * @returns {Object} a plain Object of attributes.
     */
    getAttributes(): any;
    /**
     * Get the document to which this node belongs.
     *
     * @returns {Document} the Document.
     */
    getDocument(): Document;
    /**
     * Get the parent node of this node.
     *
     * @returns {AbstractNode|undefined} the parent AbstractNode, or undefined for the root document.
     */
    getParent(): AbstractNode | undefined;
    /**
     * Get the icon URI for the named icon.
     *
     * @param {string} name - The String icon name.
     * @returns {Promise<string>} a Promise resolving to a String URI.
     */
    getIconUri(name: string): Promise<string>;
    /**
     * Get the media URI for the target.
     *
     * @param {string} target - The String target path or URL.
     * @param {string} [assetDirKey='imagesdir'] - The String asset directory attribute key.
     * @returns {string} a String URI.
     */
    getMediaUri(target: string, assetDirKey?: string): string;
    /**
     * Get the image URI for the target image.
     *
     * @param {string} targetImage - The String target image path or URL.
     * @param {string|null} [assetDirKey=null] - The String asset directory attribute key.
     * @returns {Promise<string>} a Promise resolving to a String URI.
     */
    getImageUri(targetImage: string, assetDirKey?: string | null): Promise<string>;
    /**
     * Assign the value to the attribute name for the current node.
     *
     * @param {string} name - The String attribute name to assign.
     * @param {*} [value=''] - The value to assign to the attribute.
     * @param {boolean} [overwrite=true] - Whether to overwrite an existing attribute.
     * @returns {boolean} true if set, false if blocked.
     */
    setAttr(name: string, value?: any, overwrite?: boolean): boolean;
    /**
     * Remove the attribute from the current node.
     *
     * @param {string} name - The String attribute name to remove.
     * @returns {*} the previous value, or undefined if the attribute was not present.
     */
    removeAttr(name: string): any;
    /**
     * Retrieve the value of the named attribute.
     * Alias for {@link attr} to match the public Ruby API.
     *
     * @param {string} name - The String attribute name.
     * @param {*} [defaultValue=null] - The value to return if the attribute is not found.
     * @param {string|boolean} [inherit=false] - The fallback attribute name on the Document.
     * @returns {*} the attribute value or defaultValue.
     */
    getAttr(name: string, defaultValue?: any, inherit?: string | boolean): any;
    /**
     * Check if the specified option attribute is enabled on this node.
     * This method checks whether the `<name>-option` attribute is set.
     *
     * @param {string} name - The String or Symbol name of the option.
     * @returns {boolean} true if the option is enabled, false otherwise.
     */
    hasOption(name: string): boolean;
    /**
     * Set the specified option on this node by setting the `<name>-option` attribute.
     *
     * @param {string} name - The String name of the option.
     */
    setOption(name: string): void;
    /**
     * Retrieve the Set of option names that are enabled on this node.
     *
     * @returns {Set<string>} a Set of option name strings.
     */
    enabledOptions(): Set<string>;
    /**
     * Update the attributes of this node with the new values.
     *
     * @param {Object} newAttributes - A plain object of additional attributes to assign.
     * @returns {Object} the updated attributes object on this node.
     */
    updateAttributes(newAttributes: any): any;
    /**
     * Check if the role attribute is set and, optionally, matches expectedValue.
     *
     * @param {string|null} [expectedValue=null] - The expected String value of the role.
     * @returns {boolean}
     */
    hasRoleAttr(expectedValue?: string | null): boolean;
    /**
     * Check if the specified role name is present in this node's role list.
     *
     * @param {string} name - The String role name to find.
     * @returns {boolean}
     */
    hasRole(name: string): boolean;
    /**
     * Add the given role directly to this node.
     *
     * @param {string} name - The String role name to add.
     * @returns {boolean} true if the role was added, false if it was already present.
     */
    addRole(name: string): boolean;
    /**
     * Remove the given role directly from this node.
     *
     * @param {string} name - The String role name to remove.
     * @returns {boolean} true if the role was removed, false if it was not present.
     */
    removeRole(name: string): boolean;
    /**
     * Get the value of the reftext attribute with substitutions applied.
     * The result is pre-computed during Document.parse() via {@link precomputeReftext}.
     * Falls back to the raw reftext attribute if precomputeReftext() has not been called yet.
     *
     * @returns {string|null} the String reftext or null if not set.
     */
    get reftext(): string | null;
    /**
     * Pre-compute the reftext with substitutions applied asynchronously.
     * Called during Document.parse() so the synchronous getter works during conversion.
     *
     * @returns {Promise<void>}
     */
    precomputeReftext(): Promise<void>;
    /**
     * Check if the reftext attribute is defined.
     *
     * @returns {boolean}
     */
    hasReftext(): boolean;
    /**
     * Get the value of the reftext attribute with substitutions applied.
     *
     * @returns {string|undefined} the reftext value, or undefined if not set.
     */
    getReftext(): string | undefined;
    /**
     * Check whether this node has reftext — either an explicit 'reftext' attribute
     * or a title that can serve as the cross-reference text.
     * Mirrors Ruby's AbstractNode#reftext?
     * @returns {boolean}
     */
    isReftext(): boolean;
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
    iconUri(name: string): Promise<string>;
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
    imageUri(targetImage: string, assetDirKey?: string): Promise<string>;
    /**
     * Construct a URI reference to the target media.
     *
     * @param {string} target - A String reference to the target media.
     * @param {string} [assetDirKey='imagesdir'] - The String attribute key for the media directory.
     * @returns {string} a String reference for the target media.
     */
    mediaUri(target: string, assetDirKey?: string): string;
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
    generateDataUri(targetImage: string, assetDirKey?: string | null): Promise<string>;
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
    generateDataUriFromUri(imageUri: string, cacheUri?: boolean): Promise<string>;
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
    normalizeAssetPath(assetRef: string, assetName?: string, autocorrect?: boolean): string;
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
    normalizeSystemPath(target: string, start?: string | null, jail?: string | null, opts?: any): string;
    /**
     * Normalize the web path using the PathResolver.
     *
     * @param {string} target - The String target path.
     * @param {string|null} [start=null] - The String start (parent) path.
     * @param {boolean} [preserveUriTarget=true] - Whether a URI target should be preserved as-is.
     * @returns {string} the resolved String path.
     */
    normalizeWebPath(target: string, start?: string | null, preserveUriTarget?: boolean): string;
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
    readAsset(path: string, opts?: any): Promise<string | null>;
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
    readContents(target: string, opts?: any): Promise<string | null>;
    /**
     * @deprecated Use `isUriish` from helpers.js instead.
     * @param {string} str
     * @returns {boolean}
     */
    isUri(str: string): boolean;
    /**
     * Provide a default logger.
     * The Logging mixin (logging.js) overrides this getter on the prototype.
     */
    get logger(): any;
}
