/** Handles all operations for resolving, cleaning and joining paths. */
export class PathResolver {
    /**
     * Construct a new PathResolver.
     * @param {string|null} fileSeparator - The file separator (default: '/' or '\\' on Windows).
     * @param {string|null} workingDir - The working directory (default: process.cwd()).
     */
    constructor(fileSeparator?: string | null, workingDir?: string | null);
    fileSeparator: string;
    workingDir: any;
    _partitionPathSys: {};
    _partitionPathWeb: {};
    /**
     * Check whether the specified path is an absolute path.
     * @param {string} path
     * @returns {boolean}
     */
    absolutePath(path: string): boolean;
    /**
     * Check if the specified path is an absolute root path.
     * @param {string} path
     * @returns {boolean}
     */
    root(path: string): boolean;
    /**
     * Determine if the path is a UNC (root) path.
     * @param {string} path
     * @returns {boolean}
     */
    unc(path: string): boolean;
    /**
     * Determine if the path is an absolute (root) web path.
     * @param {string} path
     * @returns {boolean}
     */
    webRoot(path: string): boolean;
    /**
     * Determine whether path descends from base.
     * @param {string} path
     * @param {string} base
     * @returns {number|false} Offset if path descends from base, false otherwise.
     */
    descendsFrom(path: string, base: string): number | false;
    /**
     * Calculate the relative path to this absolute path from the specified base directory.
     * @param {string} path
     * @param {string} base
     * @returns {string} Relative path, or the original path if it cannot be made relative.
     */
    relativePath(path: string, base: string): string;
    /**
     * Normalize path by converting backslashes to forward slashes.
     * @param {string} path
     * @returns {string} The posixified path.
     */
    posixify(path: string): string;
    /**
     * @param {string} path
     * @returns {string}
     */
    posixfy(path: string): string;
    /**
     * Expand the path by resolving parent references (..) and removing self references (.).
     * @param {string} path
     * @returns {string} The expanded path.
     */
    expandPath(path: string): string;
    /**
     * Partition the path into segments and a root prefix.
     * @param {string} path - The path to partition.
     * @param {boolean} [web=false] - Treat as web path.
     * @returns {[string[], string|null]} A 2-item array [segments, root] where root may be null.
     */
    partitionPath(path: string, web?: boolean): [string[], string | null];
    /**
     * Join segments with posix separator, prepending root if provided.
     * @param {string[]} segments
     * @param {string|null} [root=null]
     * @returns {string} The joined path.
     */
    joinPath(segments: string[], root?: string | null): string;
    /**
     * Securely resolve a system path.
     * @param {string} target - The target path.
     * @param {string|null} [start=null] - The start path.
     * @param {string|null} [jail=null] - The jail path.
     * @param {Object} [opts={}] - Options.
     * @param {boolean} [opts.recover=true] - Recover from jail escapes instead of throwing.
     * @param {string} [opts.targetName='path'] - Name used in error messages.
     * @returns {string} An absolute posix path.
     */
    systemPath(target: string, start?: string | null, jail?: string | null, opts?: {
        recover?: boolean;
        targetName?: string;
    }): string;
    /**
     * Resolve a web path from the target and start paths.
     * @param {string} target - The target path.
     * @param {string|null} [start=null] - The start (parent) path.
     * @returns {string} Path with parent references resolved and self references removed.
     */
    webPath(target: string, start?: string | null): string;
}
