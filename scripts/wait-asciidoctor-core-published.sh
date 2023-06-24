#!/bin/bash

SCRIPT=`realpath $0`
SCRIPT_PATH=`dirname ${SCRIPT}`

cd "$SCRIPT_PATH"
cd ../packages/asciidoctor

ASCIIDOCTOR_CORE_VERSION=$(node -e 'console.log(require("./package.json").dependencies["@asciidoctor/core"])')

until [ $(npm view @asciidoctor/core version) = "$ASCIIDOCTOR_CORE_VERSION" ];
do
  echo "Waiting for @asciidoctor/core $ASCIIDOCTOR_CORE_VERSION to be published..."
  sleep 5s
done

echo "@asciidoctor/core $ASCIIDOCTOR_CORE_VERSION is published!"
echo "npm view @asciidoctor/core version"
npm view  @asciidoctor/core version
