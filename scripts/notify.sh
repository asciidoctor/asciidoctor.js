#!/bin/bash
# Send a notification when a successful build occurred on the master branch

set -e

# Trigger a deployment on asciidoctor/docs.asciidoctor.org (using Netlify webhook).
# The variable "NETLIFY_WEBHOOK_URL" is defined on Travis/GitHub.
curl -X POST -d '' "$NETLIFY_WEBHOOK_URL"
