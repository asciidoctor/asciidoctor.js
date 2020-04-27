#!/bin/bash

set -e

SCRIPT=`realpath $0`
SCRIPT_PATH=`dirname ${SCRIPT}`

# Package asciidoctor/core distribution as a zip and tar.gz archive
cd "$SCRIPT_PATH"
cd ../packages/core
npm run dist
mkdir bin
cd dist/
zip -r ../bin/asciidoctor.js.dist.zip .
tar -zcvf ../bin/asciidoctor.js.dist.tar.gz .
