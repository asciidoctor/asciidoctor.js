/**
 * Node-only engine backing the highlightjs adapter's build mode
 * (`:highlightjs-mode: build`).
 *
 * The build mode is **experimental** for now: this engine's API and the
 * markup/CSS it generates may change in a future release without a major
 * version bump.
 */
export namespace buildEngine {
    let supported: boolean;
    /**
     * Colourise the (already callout-free) source with highlight.js.
     * @param {string} source - source WITHOUT callout marks (the core strips them first)
     * @param {string} lang - the source language, or null
     * @param {Object} opts - { highlightLines, numberLines, ... }
     * @returns {Promise<string>} the highlighted HTML
     */
    function highlight(source: string, lang: string, opts: any): Promise<string>;
    /**
     * Read a highlight.js theme stylesheet from the installed package.
     * @param {string} theme - theme name (e.g. 'github', 'github-dark')
     * @returns {Promise<string|null>} the CSS, or null if it cannot be read
     */
    function readThemeStylesheet(theme: string): Promise<string | null>;
    /**
     * The installed highlight.js version string, or null if unavailable.
     * @returns {Promise<string|null>}
     */
    function version(): Promise<string | null>;
}
