// ESM conversion of lib/asciidoctor.rb
//
// Defines all module-level constants and re-exports every regex constant from
// rx.js so that other modules can import everything from this single file.
//
// Omissions vs. the Ruby source
//   - Ruby-encoding constants (UTF_8, BOM_BYTES_*) – JS strings are always UTF-16.
//   - File-mode strings (FILE_READ_MODE, …) – Ruby open(2) semantics, no JS equivalent.
//   - ROOT_DIR / LIB_DIR / DATA_DIR / USER_HOME – computed via import.meta.url below
//     for Node.js; silently empty in environments where the URL API is unavailable.
//   - const_missing / autoload – Ruby metaprogramming, not applicable in JS.
//   - Compliance – defined in ./compliance.js (imported separately by substitutors.js).
//   - RUBY_ENGINE / RUBY_ENGINE_OPAL – not applicable in JS.

// ── Re-export everything from rx.js ──────────────────────────────────────────
// Consumers (e.g. substitutors.js) import Rx constants through this file so
// they do not need a direct dependency on rx.js.
export * from './rx.js'

import {
  CC_ALL,
  CC_WORD,
  CG_WORD,
  CG_ALNUM,
  CG_ALPHA,
  QuoteAttributeListRxt,
} from './rx.js'

// Local helper – same as the one inside rx.js (not exported there).
const ru = (src, flags = '') => new RegExp(src, `u${flags}`)

// ── SafeMode ─────────────────────────────────────────────────────────────────
// Mirrors the Asciidoctor::SafeMode Ruby module.
const _safeModeNamesByValue = {
  0: 'unsafe',
  1: 'safe',
  10: 'server',
  20: 'secure',
}

export const SafeMode = {
  UNSAFE: 0,
  SAFE: 1,
  SERVER: 10,
  SECURE: 20,

  // Returns the numeric value for a safe-mode name string, or undefined.
  valueForName(name) {
    const key = String(name).toUpperCase()
    const v = SafeMode[key]
    return typeof v === 'number' ? v : undefined
  },

  // Alias for valueForName
  getValueForName(name) {
    return this.valueForName(name)
  },

  // Returns the lowercase name for a numeric safe-mode value, or undefined.
  nameForValue(value) {
    return _safeModeNamesByValue[value]
  },

  // Alias for nameForValue
  getNameForValue(value) {
    return this.nameForValue(value)
  },

  // Returns all safe-mode names in ascending value order.
  names() {
    return Object.values(_safeModeNamesByValue)
  },

  // Alias for names
  getNames() {
    return this.names()
  },
}

// ── File-system paths (Node.js only) ─────────────────────────────────────────
// In a browser / Deno / Opal-compiled context these will be empty strings.
let ROOT_DIR = ''
let LIB_DIR = ''
let DATA_DIR = ''
let USER_HOME = ''
try {
  LIB_DIR = new URL('.', import.meta.url).pathname.replace(/\/$/, '')
  ROOT_DIR = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
  DATA_DIR = new URL('../../data', import.meta.url).pathname
  // Prefer $HOME; fall back to $USERPROFILE (Windows) then process.cwd()
  if (typeof process !== 'undefined') {
    USER_HOME =
      process.env.HOME ||
      process.env.USERPROFILE ||
      (process.cwd ? process.cwd() : '') // eslint-disable-line n/no-process-env
  }
} catch {}
export { ROOT_DIR, LIB_DIR, DATA_DIR, USER_HOME }

// ── Primitive constants ───────────────────────────────────────────────────────
// The newline character used for output.
export const LF = '\n'

// The null character used as an internal separator for attribute values.
export const NULL = '\0'

// The tab character.
export const TAB = '\t'

// Maximum safe integer (= Number.MAX_SAFE_INTEGER).
export const MAX_INT = 9007199254740991

// ── Document defaults ─────────────────────────────────────────────────────────
export const DEFAULT_DOCTYPE = 'article'
export const DEFAULT_BACKEND = 'html5'

export const DEFAULT_STYLESHEET_KEYS = new Set(['', 'DEFAULT'])
export const DEFAULT_STYLESHEET_NAME = 'asciidoctor.css'

// Maps legacy backend aliases to the canonical backend name.
export const BACKEND_ALIASES = {
  html: 'html5',
  docbook: 'docbook5',
}

// Default page widths (points) used when computing absolute column widths.
export const DEFAULT_PAGE_WIDTHS = { docbook: 425 }

// Default output file extensions per base backend.
export const DEFAULT_EXTENSIONS = {
  html: '.html',
  docbook: '.xml',
  pdf: '.pdf',
  epub: '.epub',
  manpage: '.man',
  asciidoc: '.adoc',
}

// File extensions that are recognized as AsciiDoc documents.
// TODO: .txt should be deprecated
export const ASCIIDOC_EXTENSIONS = {
  '.adoc': true,
  '.asciidoc': true,
  '.asc': true,
  '.ad': true,
  '.txt': true,
}

// ── Section titles ────────────────────────────────────────────────────────────
// Maps setext underline characters to section levels.
export const SETEXT_SECTION_LEVELS = {
  '=': 0,
  '-': 1,
  '~': 2,
  '^': 3,
  '+': 4,
}

// ── Admonition ───────────────────────────────────────────────────────────────
export const ADMONITION_STYLES = new Set([
  'NOTE',
  'TIP',
  'IMPORTANT',
  'WARNING',
  'CAUTION',
])
export const ADMONITION_STYLE_HEADS = new Set(
  [...ADMONITION_STYLES].map((s) => s[0])
)

// ── Block styles ──────────────────────────────────────────────────────────────
export const PARAGRAPH_STYLES = new Set([
  'comment',
  'example',
  'literal',
  'listing',
  'normal',
  'open',
  'pass',
  'quote',
  'sidebar',
  'source',
  'verse',
  'abstract',
  'partintro',
])

export const VERBATIM_STYLES = new Set([
  'literal',
  'listing',
  'source',
  'verse',
])

// ── Delimited blocks ──────────────────────────────────────────────────────────
// Maps delimiter string → [context, Set of alternative styles].
// Ruby symbols are represented as plain strings.
export const DELIMITED_BLOCKS = {
  '--': [
    'open',
    new Set([
      'comment',
      'example',
      'literal',
      'listing',
      'pass',
      'quote',
      'sidebar',
      'source',
      'verse',
      'admonition',
      'abstract',
      'partintro',
    ]),
  ],
  '----': ['listing', new Set(['literal', 'source'])],
  '....': ['literal', new Set(['listing', 'source'])],
  '====': ['example', new Set(['admonition'])],
  '****': ['sidebar', new Set()],
  ____: ['quote', new Set(['verse'])],
  '++++': ['pass', new Set(['stem', 'latexmath', 'asciimath'])],
  '|===': ['table', new Set()],
  ',===': ['table', new Set()],
  ':===': ['table', new Set()],
  '!===': ['table', new Set()],
  '~~~~': ['open', new Set(['abstract', 'partintro'])],
  '////': ['comment', new Set()],
  '```': ['fenced_code', new Set()],
}

// First 2 characters of each delimiter → true (used for fast sniff).
export const DELIMITED_BLOCK_HEADS = Object.fromEntries(
  Object.keys(DELIMITED_BLOCKS).map((k) => [k.slice(0, 2), true])
)

// 4-character delimiters only: delimiter → last character (used for tail matching).
export const DELIMITED_BLOCK_TAILS = Object.fromEntries(
  Object.keys(DELIMITED_BLOCKS)
    .filter((k) => k.length === 4)
    .map((k) => [k, k[k.length - 1]])
)

// ── Captions ──────────────────────────────────────────────────────────────────
// Maps block context to the document attribute that holds its caption prefix.
// NOTE: 'figure' key is a string for historical reasons (used by image blocks).
export const CAPTION_ATTRIBUTE_NAMES = {
  example: 'example-caption',
  figure: 'figure-caption',
  listing: 'listing-caption',
  table: 'table-caption',
}

// ── Layout breaks ─────────────────────────────────────────────────────────────
export const LAYOUT_BREAK_CHARS = {
  "'": 'thematic_break',
  '<': 'page_break',
}

export const MARKDOWN_THEMATIC_BREAK_CHARS = {
  '-': 'thematic_break',
  '*': 'thematic_break',
  _: 'thematic_break',
}

export const HYBRID_LAYOUT_BREAK_CHARS = {
  ...LAYOUT_BREAK_CHARS,
  ...MARKDOWN_THEMATIC_BREAK_CHARS,
}

// ── Lists ─────────────────────────────────────────────────────────────────────
export const NESTABLE_LIST_CONTEXTS = ['ulist', 'olist', 'dlist']

// Ordered list style names, in selection priority order.
export const ORDERED_LIST_STYLES = [
  'arabic',
  'loweralpha',
  'lowerroman',
  'upperalpha',
  'upperroman',
]

// Maps an ordered list style name to its CSS list-style-type keyword.
export const ORDERED_LIST_KEYWORDS = {
  loweralpha: 'a',
  lowerroman: 'i',
  upperalpha: 'A',
  upperroman: 'I',
}

// ── Inline markers ────────────────────────────────────────────────────────────
export const ATTR_REF_HEAD = '{'
export const LIST_CONTINUATION = '+'
// NOTE AsciiDoc.py allows + to be preceded by TAB; Asciidoctor does not
export const HARD_LINE_BREAK = ' +'
export const LINE_CONTINUATION = ' \\'
export const LINE_CONTINUATION_LEGACY = ' +'

// ── Math / STEM ───────────────────────────────────────────────────────────────
export const BLOCK_MATH_DELIMITERS = {
  asciimath: ['\\$', '\\$'],
  latexmath: ['\\[', '\\]'],
}

export const INLINE_MATH_DELIMITERS = {
  asciimath: ['\\$', '\\$'],
  latexmath: ['\\(', '\\)'],
}

// Maps STEM type aliases to canonical type names.
// Accessing an unknown key returns 'asciimath' (mirrors Ruby Hash#default).
export const STEM_TYPE_ALIASES = new Proxy(
  { latexmath: 'latexmath', latex: 'latexmath', tex: 'latexmath' },
  {
    get: (target, key) =>
      Object.hasOwn(target, key) ? target[key] : 'asciimath',
  }
)

// ── Third-party library versions ──────────────────────────────────────────────
export const FONT_AWESOME_VERSION = '4.7.0'
export const HIGHLIGHT_JS_VERSION = '9.18.3'
export const MATHJAX_VERSION = '2.7.9'

// ── Default document attributes ───────────────────────────────────────────────
export const DEFAULT_ATTRIBUTES = {
  'appendix-caption': 'Appendix',
  'appendix-refsig': 'Appendix',
  'caution-caption': 'Caution',
  'chapter-refsig': 'Chapter',
  'example-caption': 'Example',
  'figure-caption': 'Figure',
  'important-caption': 'Important',
  'last-update-label': 'Last updated',
  'note-caption': 'Note',
  'part-refsig': 'Part',
  prewrap: '',
  sectids: '',
  'section-refsig': 'Section',
  'table-caption': 'Table',
  'tip-caption': 'Tip',
  'toc-placement': 'auto',
  'toc-title': 'Table of Contents',
  'untitled-label': 'Untitled',
  'version-label': 'Version',
  'warning-caption': 'Warning',
}

// Attributes that may be changed mid-document (e.g. sectnums toggling).
export const FLEXIBLE_ATTRIBUTES = ['sectnums']

// Predefined (intrinsic) attribute substitutions.
export const INTRINSIC_ATTRIBUTES = {
  startsb: '[',
  endsb: ']',
  vbar: '|',
  caret: '^',
  asterisk: '*',
  tilde: '~',
  plus: '&#43;',
  backslash: '\\',
  backtick: '`',
  blank: '',
  empty: '',
  sp: ' ',
  'two-colons': '::',
  'two-semicolons': ';;',
  nbsp: '&#160;',
  deg: '&#176;',
  zwsp: '&#8203;',
  quot: '&#34;',
  apos: '&#39;',
  lsquo: '&#8216;',
  rsquo: '&#8217;',
  ldquo: '&#8220;',
  rdquo: '&#8221;',
  wj: '&#8288;',
  brvbar: '&#166;',
  pp: '&#43;&#43;',
  cpp: 'C&#43;&#43;',
  cxx: 'C&#43;&#43;',
  amp: '&',
  lt: '<',
  gt: '>',
}

// ── Quote substitutions ───────────────────────────────────────────────────────
// Each entry is a triple: [type, scope, RegExp].
// type  – string matching a Ruby symbol (e.g. 'strong', 'emphasis', …)
// scope – 'unconstrained' | 'constrained'
//
// Ruby regex flag notes
//   /m in Ruby = dotAll (.  matches \n); handled by CC_ALL = '[\\s\\S]' → no 's' flag needed.
//   ^ / $ are always line anchors in Ruby → need JS 'm' flag when ^ or $ appears.
//   \p{…} Unicode properties require JS 'u' flag (provided by the ru() helper).
//
// Backtick character (U+0060) cannot appear literally inside a JS template literal,
// so it is injected via the BT variable in template expressions.
const BT = '\x60' // U+0060 GRAVE ACCENT / backtick

const _normalQuoteSubs = [
  // **strong**
  [
    'strong',
    'unconstrained',
    ru(String.raw`\\?(?:${QuoteAttributeListRxt})?\*\*(${CC_ALL}+?)\*\*`),
  ],
  // *strong*
  [
    'strong',
    'constrained',
    ru(
      String.raw`(^|[^${CC_WORD};:}])(?:${QuoteAttributeListRxt})?\*(\S|\S${CC_ALL}*?\S)\*(?!${CG_WORD})`,
      'm'
    ),
  ],
  // "`double-quoted`"
  [
    'double',
    'constrained',
    ru(
      String.raw`(^|[^${CC_WORD};:}])(?:${QuoteAttributeListRxt})?"${BT}(\S|\S${CC_ALL}*?\S)${BT}"(?!${CG_WORD})`,
      'm'
    ),
  ],
  // '`single-quoted`'
  [
    'single',
    'constrained',
    ru(
      String.raw`(^|[^${CC_WORD};:${BT}}])(?:${QuoteAttributeListRxt})?'${BT}(\S|\S${CC_ALL}*?\S)${BT}'(?!${CG_WORD})`,
      'm'
    ),
  ],
  // ``monospaced``
  [
    'monospaced',
    'unconstrained',
    ru(
      String.raw`\\?(?:${QuoteAttributeListRxt})?${BT}${BT}(${CC_ALL}+?)${BT}${BT}`
    ),
  ],
  // `monospaced`
  [
    'monospaced',
    'constrained',
    ru(
      String.raw`(^|[^${CC_WORD};:"'${BT}}])(?:${QuoteAttributeListRxt})?${BT}(\S|\S${CC_ALL}*?\S)${BT}(?![${CC_WORD}"'${BT}])`,
      'm'
    ),
  ],
  // __emphasis__
  [
    'emphasis',
    'unconstrained',
    ru(String.raw`\\?(?:${QuoteAttributeListRxt})?__(${CC_ALL}+?)__`),
  ],
  // _emphasis_
  [
    'emphasis',
    'constrained',
    ru(
      String.raw`(^|[^${CC_WORD};:}])(?:${QuoteAttributeListRxt})?_(\S|\S${CC_ALL}*?\S)_(?!${CG_WORD})`,
      'm'
    ),
  ],
  // ##mark##
  [
    'mark',
    'unconstrained',
    ru(String.raw`\\?(?:${QuoteAttributeListRxt})?##(${CC_ALL}+?)##`),
  ],
  // #mark#
  [
    'mark',
    'constrained',
    ru(
      String.raw`(^|[^${CC_WORD}&;:}])(?:${QuoteAttributeListRxt})?#(\S|\S${CC_ALL}*?\S)#(?!${CG_WORD})`,
      'm'
    ),
  ],
  // ^superscript^
  [
    'superscript',
    'unconstrained',
    ru(String.raw`\\?(?:${QuoteAttributeListRxt})?\^(\S+?)\^`),
  ],
  // ~subscript~
  [
    'subscript',
    'unconstrained',
    ru(String.raw`\\?(?:${QuoteAttributeListRxt})?~(\S+?)~`),
  ],
]

// Compatibility mode overrides (entries replaced / inserted relative to normal).
const _compatQuoteSubs = [..._normalQuoteSubs]
// ``quoted''
_compatQuoteSubs[2] = [
  'double',
  'constrained',
  ru(
    String.raw`(^|[^${CC_WORD};:}])(?:${QuoteAttributeListRxt})?${BT}${BT}(\S|\S${CC_ALL}*?\S)''(?!${CG_WORD})`,
    'm'
  ),
]
// `quoted'
_compatQuoteSubs[3] = [
  'single',
  'constrained',
  ru(
    String.raw`(^|[^${CC_WORD};:}])(?:${QuoteAttributeListRxt})?${BT}(\S|\S${CC_ALL}*?\S)'(?!${CG_WORD})`,
    'm'
  ),
]
// ++monospaced++
_compatQuoteSubs[4] = [
  'monospaced',
  'unconstrained',
  ru(String.raw`\\?(?:${QuoteAttributeListRxt})?\+\+(${CC_ALL}+?)\+\+`),
]
// +monospaced+
_compatQuoteSubs[5] = [
  'monospaced',
  'constrained',
  ru(
    String.raw`(^|[^${CC_WORD};:}])(?:${QuoteAttributeListRxt})?\+(\S|\S${CC_ALL}*?\S)\+(?!${CG_WORD})`,
    'm'
  ),
]
// 'emphasis'  – inserted before original index 3 (single-quoted)
_compatQuoteSubs.splice(3, 0, [
  'emphasis',
  'constrained',
  ru(
    String.raw`(^|[^${CC_WORD};:}])(?:${QuoteAttributeListRxt})?'(\S|\S${CC_ALL}*?\S)'(?!${CG_WORD})`,
    'm'
  ),
])

// Keyed by boolean compat mode (false = normal, true = compat).
// JS object keys are always strings, so QUOTE_SUBS[false] coerces to QUOTE_SUBS['false'].
export const QUOTE_SUBS = { false: _normalQuoteSubs, true: _compatQuoteSubs }

// ── Text replacements ─────────────────────────────────────────────────────────
// Each entry is a triple: [RegExp, replacement String, position hint].
// position hints: 'none' | 'leading' | 'bounding'
//
// NOTE: order of replacements is significant.
export const REPLACEMENTS = [
  // (C)
  [/\\?\(C\)/, '&#169;', 'none'],
  // (R)
  [/\\?\(R\)/, '&#174;', 'none'],
  // (TM)
  [/\\?\(TM\)/, '&#8482;', 'none'],
  // foo -- bar  (either space may be a newline; ^ / $ are line anchors → 'm' flag)
  [/(?: |\n|^|\\)--(?: |\n|$)/m, '&#8201;&#8212;&#8201;', 'none'],
  // foo--bar
  [
    ru(String.raw`(${CG_WORD})\\?--(?=${CG_WORD})`),
    '&#8212;&#8203;',
    'leading',
  ],
  // ellipsis
  [/\\?\.\.\./, '&#8230;&#8203;', 'none'],
  // right single quote
  [/\\?`'/, '&#8217;', 'none'],
  // apostrophe (inside a word)
  [ru(String.raw`(${CG_ALNUM})\\?'(?=${CG_ALPHA})`), '&#8217;', 'leading'],
  // right arrow ->
  [/\\?-&gt;/, '&#8594;', 'none'],
  // right double arrow =>
  [/\\?=&gt;/, '&#8658;', 'none'],
  // left arrow <-
  [/\\?&lt;-/, '&#8592;', 'none'],
  // left double arrow <=
  [/\\?&lt;=/, '&#8656;', 'none'],
  // restore entities
  [
    /\\?(&)amp;((?:[a-zA-Z][a-zA-Z]+\d{0,2}|#\d\d\d{0,4}|#x[\da-fA-F][\da-fA-F][\da-fA-F]{0,3});)/,
    '',
    'bounding',
  ],
]
