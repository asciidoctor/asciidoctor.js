// ESM conversion of convert.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby module methods on Asciidoctor → named exports convert() and convertFile()
//     (deprecated aliases: render, renderFile).
//   - Ruby File === input → duck-type: any object with a .path property is treated as a file.
//   - Ruby File.absolute_path / File.dirname / File.expand_path → node:path.resolve / .dirname.
//   - Ruby Dir.pwd → process.cwd().
//   - Ruby File.directory? → async _isDirectory() helper via node:fs/promises.
//   - Ruby File.file? → async _isFile() helper via node:fs/promises.
//   - Ruby File.write → async writeFile() via node:fs/promises.
//   - Ruby Helpers.mkdir_p → mkdirP() from helpers.js.
//   - Ruby Helpers.uriish? → isUriish() from helpers.js.
//   - Ruby Stylesheets.instance.write_primary_stylesheet → not yet ported to JS; skipped.
//   - Ruby doc.syntax_highlighter → doc.syntaxHighlighter.
//   - Ruby syntax_hl.write_stylesheet? doc → syntaxHl.writeStylesheet(doc).
//   - Ruby syntax_hl.write_stylesheet doc, dir → syntaxHl.writeStylesheetToDisk(doc, dir).
//   - Ruby doc.normalize_system_path → doc.normalizeSystemPath.
//   - Ruby doc.attr? 'x' → doc.hasAttr('x').
//   - Ruby doc.attr 'x' → doc.attr('x').
//   - Ruby doc.basebackend? 'html' → doc.basebackend('html').
//   - The entire function is async because load() is async.

import { load } from './load.js'
import { isUriish, mkdirP } from './helpers.js'
import { SafeMode, DEFAULT_STYLESHEET_KEYS } from './constants.js'

// ── convert ───────────────────────────────────────────────────────────────────

// Public: Parse the AsciiDoc source input into a Document and convert it to
// the specified backend format.
//
// Accepts input as a Node.js Readable stream (or any object with a read()
// method), a String, or a String Array. If the input is a file-like object
// with a .path property, it is treated as a file: the output is written to a
// file adjacent to the input by default.
//
// If :to_file is true or omitted and the input is a file-like object, the
// output is written next to the input file. If :to_file is a String path, the
// output is written there. If :to_file is false, the converted String is
// returned. If :to_file is '/dev/null', the document is loaded but neither
// converted nor written.
//
// input   - the AsciiDoc source (String, Array, Readable, or file-like object
//           with a .path property)
// options - a plain Object of options (default: {})
//           Notable keys (mirrors Ruby API):
//             to_file     - String path, Boolean, stream object, or '/dev/null'
//             to_dir      - String output directory
//             mkdirs      - Boolean; create missing directories if true
//             standalone  - Boolean; include header/footer
//             header_footer - Boolean (deprecated alias for :standalone)
//             base_dir    - String base directory
//
// Returns a Promise that resolves to the Document if output was written to a
// file, otherwise the converted String.
export async function convert (input, options = {}) {
  options = Object.assign({}, options)
  delete options.parse
  const toDir  = options.to_dir;  delete options.to_dir
  const mkdirs = options.mkdirs;  delete options.mkdirs

  let toFile      = options.to_file; delete options.to_file
  let siblingPath = null
  let writeToTarget = null
  let streamOutput  = false

  if (toFile === true || toFile == null) {
    writeToTarget = toDir || null
    if (!writeToTarget && input && typeof input === 'object' && input.path) {
      const nodePath = await _requirePath()
      siblingPath = nodePath.resolve(input.path)
    }
    toFile = null
  } else if (toFile === false) {
    toFile = null
  } else if (toFile === '/dev/null') {
    return load(input, options)
  } else {
    if (typeof toFile === 'object' && typeof toFile.write === 'function') {
      streamOutput = true
    } else {
      options.to_file = toFile
      writeToTarget = toFile
    }
  }

  // Normalise :header_footer → :standalone when writing to a target.
  if (!('standalone' in options)) {
    if (siblingPath || writeToTarget) {
      options.standalone = 'header_footer' in options ? options.header_footer : true
    } else if ('header_footer' in options) {
      options.standalone = options.header_footer
    }
  }

  // NOTE outfile may be controlled by document attributes, so resolve outfile after loading.
  // NOTE the :to_dir option is always set when outputting to a file.
  // NOTE the :to_file option is only passed if assigned an explicit path.
  if (siblingPath) {
    const nodePath = await _requirePath()
    options.to_dir = nodePath.dirname(siblingPath)
  } else if (writeToTarget) {
    const nodePath = await _requirePath()
    if (toDir) {
      if (toFile) {
        options.to_dir = nodePath.dirname(nodePath.resolve(toDir, toFile))
      } else {
        options.to_dir = nodePath.resolve(toDir)
      }
    } else if (toFile) {
      options.to_dir = nodePath.dirname(nodePath.resolve(toFile))
    }
  }

  const doc = await load(input, options)

  let outfile, outdir

  if (siblingPath) {
    const nodePath = await _requirePath()
    outdir  = nodePath.dirname(siblingPath)
    outfile = nodePath.join(outdir, `${doc.attributes['docname']}${doc.outfilesuffix}`)
    if (outfile === siblingPath) {
      throw new Error(`input file and output file cannot be the same: ${outfile}`)
    }
  } else if (writeToTarget) {
    const nodePath = await _requirePath()
    const workingDir = options.base_dir ? nodePath.resolve(options.base_dir) : process.cwd()
    // QUESTION should the jail be workingDir or doc.baseDir?
    const jail = doc.safe >= SafeMode.SAFE ? workingDir : null

    if (toDir) {
      outdir = doc.normalizeSystemPath(toDir, workingDir, jail, { targetName: 'to_dir', recover: false })
      if (toFile) {
        outfile = doc.normalizeSystemPath(toFile, outdir, null, { targetName: 'to_dir', recover: false })
        // reestablish outdir as the final target directory (in case to_file had directory segments)
        outdir = nodePath.dirname(outfile)
      } else {
        outfile = nodePath.join(outdir, `${doc.attributes['docname']}${doc.outfilesuffix}`)
      }
    } else if (toFile) {
      outfile = doc.normalizeSystemPath(toFile, workingDir, jail, { targetName: 'to_dir', recover: false })
      // establish outdir as the final target directory (in case to_file had directory segments)
      outdir = nodePath.dirname(outfile)
    }

    if (input && typeof input === 'object' && input.path) {
      const absInputPath = nodePath.resolve(input.path)
      if (outfile === absInputPath) {
        throw new Error(`input file and output file cannot be the same: ${outfile}`)
      }
    }

    if (mkdirs) {
      await mkdirP(outdir)
    } else {
      if (!await _isDirectory(outdir)) {
        // NOTE we intentionally refer to the directory as it was passed to the API
        throw new Error(`target directory does not exist: ${toDir} (hint: set mkdirs option)`)
      }
    }
  } else {
    // write to stream
    outfile = streamOutput ? toFile : null
    outdir  = null
  }

  let output
  if (outfile && !streamOutput) {
    output = await doc.convert({ outfile, outdir })
  } else {
    output = await doc.convert()
  }

  if (outfile) {
    doc.write(output, outfile)

    // NOTE document cannot control this behavior if safe >= SafeMode.SERVER
    // NOTE skip if stylesdir is a URI
    if (!streamOutput && doc.safe < SafeMode.SECURE &&
      doc.hasAttr('linkcss') && doc.hasAttr('copycss') &&
      doc.basebackend('html') &&
      !((doc.attr('stylesdir')) && isUriish(doc.attr('stylesdir')))) {
      let copyAsciidoctorStylesheet = false
      let copyUserStylesheet = false
      const stylesheet = doc.attr('stylesheet')
      if (stylesheet) {
        if (DEFAULT_STYLESHEET_KEYS.has(stylesheet)) {
          copyAsciidoctorStylesheet = true
        } else if (!isUriish(stylesheet)) {
          copyUserStylesheet = true
        }
      }
      const syntaxHl = doc.syntaxHighlighter
      const copySyntaxHlStylesheet = syntaxHl && syntaxHl.writeStylesheet(doc)

      if (copyAsciidoctorStylesheet || copyUserStylesheet || copySyntaxHlStylesheet) {
        const stylesdir = doc.attr('stylesdir')
        const stylesoutdir = doc.normalizeSystemPath(stylesdir, outdir, doc.safe >= SafeMode.SAFE ? outdir : null)
        if (mkdirs) {
          await mkdirP(stylesoutdir)
        } else {
          if (!await _isDirectory(stylesoutdir)) {
            throw new Error(`target stylesheet directory does not exist: ${stylesoutdir} (hint: set mkdirs option)`)
          }
        }

        if (copyAsciidoctorStylesheet) {
          // NOTE Stylesheets.instance.write_primary_stylesheet is not yet ported to JS
        } else if (copyUserStylesheet) {
          let stylesheetSrc = doc.attr('copycss')
          if (stylesheetSrc === '' || stylesheetSrc === true) {
            stylesheetSrc = doc.normalizeSystemPath(stylesheet)
          } else {
            // NOTE in this case, copycss is a source location (but cannot be a URI)
            stylesheetSrc = doc.normalizeSystemPath(String(stylesheetSrc))
          }
          const stylesheetDest = doc.normalizeSystemPath(stylesheet, stylesoutdir,
            doc.safe >= SafeMode.SAFE ? outdir : null)
          // NOTE don't warn if src can't be read and dest already exists (see #2323)
          if (stylesheetSrc !== stylesheetDest) {
            const warnOnFailure = !await _isFile(stylesheetDest)
            const stylesheetData = doc.readAsset(stylesheetSrc, { warnOnFailure, label: 'stylesheet' })
            if (stylesheetData) {
              const { writeFile } = await import('node:fs/promises')
              const nodePath = await _requirePath()
              const stylesheetOutdir = nodePath.dirname(stylesheetDest)
              if (stylesheetOutdir !== stylesoutdir && !await _isDirectory(stylesheetOutdir)) {
                if (!mkdirs) {
                  throw new Error(`target stylesheet directory does not exist: ${stylesheetOutdir} (hint: set mkdirs option)`)
                }
                await mkdirP(stylesheetOutdir)
              }
              await writeFile(stylesheetDest, stylesheetData, 'utf8')
            }
          }
        }
        if (copySyntaxHlStylesheet) {
          await syntaxHl.writeStylesheetToDisk(doc, stylesoutdir)
        }
      }
    }
    return doc
  } else {
    return output
  }
}

// ── convertFile ───────────────────────────────────────────────────────────────

// Public: Parse the contents of the AsciiDoc source file into a Document and
// convert it to the specified backend format.
//
// filename - the String path to the AsciiDoc source file
// options  - a plain Object of options (default: {})
//
// Returns a Promise that resolves to the Document if output was written to a
// file, otherwise the converted String.
export async function convertFile (filename, options = {}) {
  const { readFile, stat } = await import('node:fs/promises')
  const nodePath = await _requirePath()
  const absPath = nodePath.resolve(filename)
  const content = await readFile(absPath, 'utf8')
  let mtime
  try {
    mtime = (await stat(absPath)).mtime
  } catch { /* ignore */ }
  const fileObj = {
    path: absPath,
    mtime,
    read () { return content },
  }
  return convert(fileObj, options)
}

// Deprecated aliases
export { convert as render, convertFile as renderFile }

// ── Helpers ───────────────────────────────────────────────────────────────────

// Internal: Lazily import node:path to avoid issues in browser / Opal environments.
async function _requirePath () {
  return import('node:path')
}

// Internal: Return true if the given path is an existing directory.
async function _isDirectory (dir) {
  try {
    const { stat } = await import('node:fs/promises')
    return (await stat(dir)).isDirectory()
  } catch {
    return false
  }
}

// Internal: Return true if the given path is an existing file.
async function _isFile (path) {
  try {
    const { stat } = await import('node:fs/promises')
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}
