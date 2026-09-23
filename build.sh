#!/usr/bin/env bash
# Build the hosted copy from index.html. index.html is the single source: it is
# also what gets published as the private Artifact, which is why it carries no
# <head> of its own (the Artifact host supplies one). This wraps it in a real
# document and adds what a standalone page needs: a manifest, icons, and a
# service worker so it works offline after the first visit.
#
#   ./build.sh           build into site/
#
# The PNG icons in src/ are rendered from src/icon.svg at 192 and 512 px by any
# SVG rasterizer; they are committed so the build needs nothing but bash.
set -euo pipefail
cd "$(dirname "$0")"

OUT=site
VERSION="$(date -u +%Y%m%d%H%M)"
mkdir -p "$OUT"

# index.html's first line is its <title>; the hosted copy sets it in <head>.
{ cat src/head.html; tail -n +2 index.html; printf '</body>\n</html>\n'; } > "$OUT/index.html"

sed "s/__VERSION__/$VERSION/" src/sw.js > "$OUT/sw.js"
cp engine.js lexicon.txt lexicon-extra.txt "$OUT/"
cp src/manifest.webmanifest src/icon.svg src/icon-192.png src/icon-512.png "$OUT/"

printf 'built %s (sw cache understory-%s)\n' "$OUT/index.html" "$VERSION"
