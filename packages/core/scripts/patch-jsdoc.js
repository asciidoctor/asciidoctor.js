/**
 * Post-processes generated .d.ts files to restore JSDoc comments on namespace
 * variable declarations where TypeScript's allowJs synthesis dropped them.
 *
 * TypeScript preserves JSDoc on MethodDeclaration members but silently drops it
 * on PropertyAssignment members when synthesizing namespace declarations from JS
 * object literals. This script reads the originating JS source files and injects
 * the missing comments into the corresponding generated .d.ts files.
 */
import ts from 'typescript'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = fileURLToPath(new URL('../src', import.meta.url))
const typesDir = fileURLToPath(new URL('../types', import.meta.url))

/** Returns the raw text of the last leading JSDoc comment for a node, or null. */
function leadingJSDoc(node, src) {
  const ranges = ts.getLeadingCommentRanges(src, node.getFullStart()) ?? []
  const jsdocs = ranges.filter((r) => src.startsWith('/**', r.pos))
  if (!jsdocs.length) return null
  const { pos, end } = jsdocs[jsdocs.length - 1]
  return src.slice(pos, end)
}

/**
 * Parses a JS source file and returns a Map from export name to a Map of
 * property name → raw JSDoc text, for every exported object literal whose
 * properties carry JSDoc comments.
 */
function collectPropertyJSDoc(jsPath) {
  const src = readFileSync(jsPath, 'utf-8')
  const sf = ts.createSourceFile(jsPath, src, ts.ScriptTarget.Latest, true)
  const byExport = new Map()

  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue
    const mods = ts.getModifiers(stmt) ?? []
    if (!mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue

    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue
      if (!ts.isObjectLiteralExpression(decl.initializer)) continue

      const byProp = new Map()
      for (const prop of decl.initializer.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue
        const doc = leadingJSDoc(prop, src)
        if (doc) byProp.set(prop.name.text, doc)
      }
      if (byProp.size) byExport.set(decl.name.text, byProp)
    }
  }

  return byExport
}

/** Re-indents a raw JSDoc block (starting with `/**`) to the given indent. */
function reindent(jsdoc, indent) {
  return jsdoc
    .split('\n')
    .map((line, i) => (i === 0 ? indent + line : indent + ' ' + line.trimStart()))
    .join('\n')
}

/**
 * Parses a JS source file and returns the set of class names annotated with @abstract.
 * TypeScript does not translate the @abstract JSDoc tag to `abstract class` in .d.ts output,
 * so we detect it here and apply it as a post-processing step.
 */
function collectAbstractClasses(jsPath) {
  const src = readFileSync(jsPath, 'utf-8')
  const sf = ts.createSourceFile(jsPath, src, ts.ScriptTarget.Latest, true)
  const names = new Set()

  for (const stmt of sf.statements) {
    if (!ts.isClassDeclaration(stmt) || !stmt.name) continue
    const ranges = ts.getLeadingCommentRanges(src, stmt.getFullStart()) ?? []
    const hasAbstractTag = ranges.some((r) => {
      const text = src.slice(r.pos, r.end)
      return text.includes('@abstract')
    })
    if (hasAbstractTag) names.add(stmt.name.text)
  }

  return names
}

/**
 * Patches a .d.ts file by adding the `abstract` keyword to class declarations
 * that correspond to @abstract-annotated classes in the JS source.
 * Returns true if any changes were made.
 */
function patchAbstractClasses(dtsPath, abstractClassNames) {
  if (!abstractClassNames.size) return false
  let src = readFileSync(dtsPath, 'utf-8')
  let changed = false

  for (const name of abstractClassNames) {
    const before = src
    src = src.replace(
      new RegExp(`(export\\s+(?:declare\\s+)?)class\\s+${name}\\b`, 'g'),
      `$1abstract class ${name}`
    )
    if (src !== before) changed = true
  }

  if (changed) writeFileSync(dtsPath, src, 'utf-8')
  return changed
}

/**
 * Patches a .d.ts file by inserting JSDoc before namespace variable declarations
 * that lack it but have a matching entry in jsdocByExport.
 * Returns true if any insertions were made.
 */
function patchFile(dtsPath, jsdocByExport) {
  let src = readFileSync(dtsPath, 'utf-8')
  const sf = ts.createSourceFile(dtsPath, src, ts.ScriptTarget.Latest, true)
  const insertions = []

  for (const stmt of sf.statements) {
    if (!ts.isModuleDeclaration(stmt) || !ts.isIdentifier(stmt.name)) continue
    const byProp = jsdocByExport.get(stmt.name.text)
    if (!byProp || !stmt.body || !ts.isModuleBlock(stmt.body)) continue

    for (const member of stmt.body.statements) {
      if (!ts.isVariableStatement(member)) continue
      for (const decl of member.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue
        const doc = byProp.get(decl.name.text)
        if (!doc) continue

        // Skip if the member already has a JSDoc comment
        const existing = ts.getLeadingCommentRanges(src, member.getFullStart()) ?? []
        if (existing.some((r) => src.startsWith('/**', r.pos))) continue

        // Derive indentation from the column of the member's first token
        const memberStart = member.getStart(sf)
        const lineStart = src.lastIndexOf('\n', memberStart) + 1
        const indent = src.slice(lineStart, memberStart)

        insertions.push({ pos: lineStart, text: reindent(doc, indent) + '\n' })
      }
    }
  }

  if (!insertions.length) return false

  // Apply from end to start so earlier offsets stay valid
  insertions.sort((a, b) => b.pos - a.pos)
  for (const { pos, text } of insertions) {
    src = src.slice(0, pos) + text + src.slice(pos)
  }
  writeFileSync(dtsPath, src, 'utf-8')
  return true
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) { walk(full); continue }
    if (!entry.endsWith('.d.ts')) continue

    const jsPath = join(srcDir, entry.replace(/\.d\.ts$/, '.js'))
    if (!existsSync(jsPath)) continue

    const abstractClasses = collectAbstractClasses(jsPath)
    if (patchAbstractClasses(full, abstractClasses)) {
      console.log(`patched abstract class(es) in ${entry}`)
    }

    const jsdocByExport = collectPropertyJSDoc(jsPath)
    if (!jsdocByExport.size) continue

    if (patchFile(full, jsdocByExport)) {
      console.log(`patched namespace JSDoc in ${entry}`)
    }
  }
}

walk(typesDir)