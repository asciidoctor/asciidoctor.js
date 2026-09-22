#!/bin/bash
# Waits until the packages published by tasks/publish.js are visible on the npm registry.
# The registry can take several minutes to expose a freshly published version.

SCRIPT=`realpath $0`
SCRIPT_PATH=`dirname ${SCRIPT}`

cd "$SCRIPT_PATH/.."

for PACKAGE_DIR in packages/core packages/asciidoctor; do
  PACKAGE_NAME=$(node -p "require('./$PACKAGE_DIR/package.json').name")
  PACKAGE_VERSION=$(node -p "require('./$PACKAGE_DIR/package.json').version")
  until [ "$(npm view "$PACKAGE_NAME@$PACKAGE_VERSION" version 2>/dev/null)" = "$PACKAGE_VERSION" ];
  do
    echo "Waiting for $PACKAGE_NAME $PACKAGE_VERSION to be published..."
    sleep 15s
  done
  echo "$PACKAGE_NAME $PACKAGE_VERSION is published!"
done
