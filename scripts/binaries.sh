#!/bin/bash
# Produce a self-contained asciidoctor binary using Node.js SEA.
# Template engines (ejs, handlebars, nunjucks, pug) are bundled into
# the binary as devDependencies — not required at runtime by the npm package.

SCRIPT=$(realpath "$0")
SCRIPT_PATH=$(dirname "$SCRIPT")

cd "$SCRIPT_PATH/.."

npm install
npm run build:binary