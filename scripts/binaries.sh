#!/bin/bash
# Produce macOS, Linux and Windows binaries from asciidoctor/cli

SCRIPT=`realpath $0`
SCRIPT_PATH=`dirname ${SCRIPT}`

cd "$SCRIPT_PATH"
cd ../packages/asciidoctor

# @asciidoctor/core must be published to npmjs before we can install the dependencies
npm i --prefix packages/asciidoctor
npm run dist
