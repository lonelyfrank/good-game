#!/bin/bash
# Build module.zip for GitHub release
# Usage: ./build.sh
set -e

OUT="module.zip"
rm -f "$OUT"

zip -r "$OUT" \
  module.json \
  scripts/ \
  styles/ \
  templates/ \
  lang/ \
  assets/ \
  --exclude "*.DS_Store" \
  --exclude "*/.git*" \
  --exclude "*/node_modules/*"

echo "Created $OUT ($(du -h "$OUT" | cut -f1))"
