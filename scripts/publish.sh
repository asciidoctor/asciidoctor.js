#!/bin/bash
# Publish the packages to npmjs

set -e

SCRIPT=`realpath $0`
SCRIPT_PATH=`dirname ${SCRIPT}`

cd "$(dirname "$0")"
cd ..
node tasks/publish.js
