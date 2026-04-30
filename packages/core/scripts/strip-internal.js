/**
 * Post-processes generated .d.ts files to remove declarations tagged @internal.
 *
 * TypeScript's stripInternal option is silently ignored for JS sources compiled
 * via allowJs, so we do it here using the compiler API — no regex, no re-emit.
 * For each file we:
 *   1. Parse the source into an AST.
 *   2. Walk class/interface members, namespace statements, and top-level
 *      statements to collect nodes whose JSDoc contains @internal.
 *   3. Sort the collected ranges descending by position and splice them out of
 *      the original source string, preserving all other formatting exactly.
 */
import ts from 'typescript'
import { readFileSync, writeFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

function isInternal(node) {
  return ts.getJSDocTags(node).some((tag) => tag.tagName.escapedText === 'internal')
}

function collectInternalNodes(sourceFile) {
  const internals = []

  function visitTypeLiteral(node) {
    for (const member of node.members) {
      if (ts.isPropertySignature(member) || ts.isMethodSignature(member)) {
        const name = member.name && ts.isIdentifier(member.name) ? member.name.text : null
        if (isInternal(member) || (name && name.startsWith('_'))) {
          internals.push(member)
        }
      }
    }
  }

  function visitNode(node) {
    ts.forEachChild(node, (child) => {
      if (ts.isTypeLiteralNode(child)) {
        visitTypeLiteral(child)
      } else {
        visitNode(child)
      }
    })
  }

  function visit(node) {
    if (ts.isSourceFile(node) || ts.isModuleBlock(node)) {
      for (const child of node.statements) {
        if (isInternal(child)) {
          internals.push(child)
        } else {
          visit(child)
        }
      }
    } else if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      for (const member of node.members) {
        if (isInternal(member)) {
          internals.push(member)
        } else {
          visitNode(member)
        }
      }
    } else if (ts.isModuleDeclaration(node)) {
      if (node.body) visit(node.body)
    }
  }

  visit(sourceFile)
  return internals
}

function stripInternalFromFile(filePath) {
  const source = readFileSync(filePath, 'utf-8')
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, /* setParentNodes */ true)

  const internals = collectInternalNodes(sourceFile)
  if (internals.length === 0) return

  // Remove from end to start so earlier offsets stay valid
  internals.sort((a, b) => b.getFullStart() - a.getFullStart())

  let result = source
  for (const node of internals) {
    result = result.slice(0, node.getFullStart()) + result.slice(node.getEnd())
  }

  writeFileSync(filePath, result, 'utf-8')
  console.log(`stripped ${internals.length} @internal declaration(s) from ${filePath}`)
}

function walkDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walkDir(full)
    } else if (entry.endsWith('.d.ts')) {
      stripInternalFromFile(full)
    }
  }
}

const typesDir = fileURLToPath(new URL('../types', import.meta.url))
walkDir(typesDir)