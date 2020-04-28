#!/bin/bash
# Produce macOS, Linux and Windows binaries from asciidoctor/cli

SCRIPT=`realpath $0`
SCRIPT_PATH=`dirname ${SCRIPT}`

cd "$SCRIPT_PATH"
cd ../packages/asciidoctor

# @asciidoctor/core must be published to npmjs before we can install the dependencies
npm i --save ejs@3.1.2 handlebars@4.7.6 nunjucks@3.2.1 pug@2.0.4
npm i
npm run dist
