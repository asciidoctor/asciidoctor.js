/**
 * Resolve an include path in a browser (URI-based) environment.
 *
 * Implements the rules from the browser-include-spec, in the same order:
 *
 * Top-level include (includeStack is empty):
 * 1. target starts with file:// → inc_path = relpath = target
 * 2. target is a URI → must descend from baseDir or allow-uri-read; else → link
 * 3. target is an absolute OS path → prepend file:// (or file:///)
 * 4. baseDir == '.' → inc_path = relpath = target  (resolved by XMLHttpRequest/fetch)
 * 5. baseDir starts with file:// OR baseDir is not a URI → inc_path = baseDir/target; relpath = target
 * 6. baseDir is an absolute URL → inc_path = baseDir/target; relpath = target
 *
 * Nested include (includeStack is non-empty):
 * Rules 1–3 same as top-level.
 * 4. parentDir == '.' → inc_path = relpath = target
 * 5. parentDir starts with file:// OR parentDir is not a URI
 *      → inc_path = parentDir/target
 *      → relpath = inc_path if baseDir=='.' or inc_path not under baseDir, else path difference
 * 6. parentDir is an absolute URL
 *      → must descend from baseDir or allow-uri-read; else → link
 *      → inc_path = parentDir/target
 *      → relpath = path difference if parentDir descends from baseDir, else target
 * @param {object} reader - a PreprocessorReader instance
 * @param {string} target - the raw include target string
 * @param {string|null} attrlist - the raw attribute list string
 * @returns {[string, string]|boolean} [incPath, relpath] on success, or boolean when the line was consumed.
 */
export function resolveBrowserIncludePath(reader: object, target: string, attrlist: string | null): [string, string] | boolean;
