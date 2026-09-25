#!/bin/bash
# One command to move the version, because doing it by hand missed the manifest for
# twenty-eight builds and the phone kept showing an old icon.
set -e
cd "$(dirname "$0")"
OLD=$(cat version.txt)
NEW=$1
[ -z "$NEW" ] && { echo "usage: ./bump.sh 2026-09-24-40   (current: $OLD)"; exit 1; }
git mv "icons/$OLD" "icons/$NEW"
sed -i '' "s/const BUILD = '$OLD';/const BUILD = '$NEW';/" js/core.js
sed -i '' "s|?v=$OLD|?v=$NEW|g; s|icons/$OLD/|icons/$NEW/|g" index.html
sed -i '' "s|icons/[0-9-]*/|icons/$NEW/|g" manifest.webmanifest
echo "$NEW" > version.txt
echo "--- anything still on $OLD (want nothing) ---"
grep -rn "$OLD" index.html js/core.js manifest.webmanifest version.txt || echo "  clean"
echo "--- $NEW appears ---"
printf "  index.html %s times\n" "$(grep -c "$NEW" index.html)"
printf "  manifest   %s times\n" "$(grep -c "$NEW" manifest.webmanifest)"
grep -n "const BUILD" js/core.js
for f in core academy community lists today schedule team; do
  /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc -e "new Function(read(\"js/$f.js\"));" || { echo "SYNTAX FAIL: $f"; exit 1; }
done
echo "all files parse"
