#!/bin/bash

set -e

# Package asciidoctor/core distribution as a zip and tar.gz archive
cd "$(dirname "$0")"
cd ../packages/core
npm run dist
mkdir bin
cd dist/
zip -r ../bin/asciidoctor.js.dist.zip .
tar -zcvf ../bin/asciidoctor.js.dist.tar.gz .

# Produce macOS, Linux and Windows binaries from asciidoctor/cli
cd "$(dirname "$0")"
cd ../packages/asciidoctor
npm run dist
