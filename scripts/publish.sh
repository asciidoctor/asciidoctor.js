#!/bin/bash
# Publish the packages to npmjs

set -e

cd "$(dirname "$0")"

cd ..
node tasks/publish.js
