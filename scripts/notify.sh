#!/bin/bash
# Send a notification when a successful build occurred on the main branch

set -e

# Trigger a deployment on asciidoctor/docs.asciidoctor.org (using Netlify webhook).
# The variable "NETLIFY_WEBHOOK_URL" is defined on Travis/GitHub.
if [[ -z "$NETLIFY_WEBHOOK_URL" ]]; then
  echo 'The variable NETLIFY_WEBHOOK_URL is not defined, unable to notify Netlify!'
else
  curl -X POST -d '' "$NETLIFY_WEBHOOK_URL"
fi
