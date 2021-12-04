#!/bin/bash

BASE_DIR=`pwd`
REMOTE_BASE_DIR="https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/main/spec"

RELATIVE_PATH="fixtures/include.adoc"
RELATIVE_PATH_UNRESOLVED="fixtures/../fixtures/include.adoc"

RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m' # Reset

function title {
  printf "${BOLD}$1${RESET}\n"
}

function test_include_directive {
  asciidoc_content="$1"
  cmd_args="$2"
  echo "$asciidoc_content" | eval "asciidoctor $cmd_args -s -" | grep "include content" > /dev/null
  return_code=$?
  if [ "$return_code" -ne "0" ]; then
    printf "${RED}❌ KO${RESET}"
  else
    printf "${GREEN}✓ OK${RESET}"
  fi
  echo ""
  echo ""
}

title "should include file with a relative path when base_dir is defined (with file:// protocol)"
test_include_directive "include::$RELATIVE_PATH[]" "--base-dir \"file://$BASE_DIR\""

title "should include file with a relative path (containing ..) when base_dir is defined (with file:// protocol)"
test_include_directive "include::$RELATIVE_PATH_UNRESOLVED[]" "--base-dir \"file://$BASE_DIR\""

title "should include file with an absolute path (with file:// protocol)"
test_include_directive "include::file://$BASE_DIR/$RELATIVE_PATH[]" "-a allow-uri-read"

title "should include file with an absolute path (containing .. and with file:// protocol)"
test_include_directive "include::file://$BASE_DIR/$RELATIVE_PATH_UNRESOLVED[]" "-a allow-uri-read"

title "should include file with a relative path"
test_include_directive "include::$RELATIVE_PATH[]" ""

title "should include file with an absolute path (with file:// protocol) when base_dir is defined (with file:// protocol)"
test_include_directive  "include::file://$BASE_DIR/$RELATIVE_PATH[]" "--base-dir \"file://$BASE_DIR\" -a allow-uri-read"

title "should include file with an absolute path (with https:// protocol) when base_dir is defined (with https:// protocol)"
test_include_directive  "include::$REMOTE_BASE_DIR/$RELATIVE_PATH[]" "--base-dir \"$REMOTE_BASE_DIR\" -a allow-uri-read"

title "should include file with a relative path when base_dir is defined (with https:// protocol)"
test_include_directive  "include::$RELATIVE_PATH[]" "--base-dir \"$REMOTE_BASE_DIR\" -a allow-uri-read"

title "should include file with a relative path (containing ..) when base_dir is defined (with https:// protocol)"
test_include_directive  "include::$RELATIVE_PATH_UNRESOLVED[]" "--base-dir \"$REMOTE_BASE_DIR\" -a allow-uri-read"

title "should include file with an absolute path (containing ..)"
test_include_directive  "include::$REMOTE_BASE_DIR/$RELATIVE_PATH_UNRESOLVED[]" "-a allow-uri-read"
