#!/usr/bin/env bash
# Fills cloudflare/public/a/ with the app's pictures and sounds (the a/ files of `tools/build.mjs --pwa`, named by their
# contents) for the Worker deploy (wrangler.toml [assets]). Used by .github/workflows/release-build.yml and deploy-worker.yml.
# Sources: every app folder given as an argument (e.g. the release being built), then the a/ folder of the newest
# KEEP published releases (their ShambConkins_<tag>_pwa.zip; needs gh + GH_TOKEN), so a phone still on the previous
# version keeps finding its files. A release from before the split has no a/ and adds nothing.
# Usage: KEEP=2 tools/worker-assets.sh [app-folder ...]
set -euo pipefail
OUT=cloudflare/public/a
KEEP=${KEEP:-2}
rm -rf "$OUT"; mkdir -p "$OUT"
for d in "$@"; do
  test -d "$d/a" || { echo "::error::$d has no a/ folder (build it with tools/build.mjs --pwa)"; exit 1; }
  cp "$d"/a/* "$OUT"/   # same name = same bytes, so copying over is harmless
  echo "from $d: $(ls "$d/a" | wc -l) files"
done
if [ "$KEEP" -gt 0 ]; then
  TMP=$(mktemp -d)
  for tag in $(gh release list --limit "$KEEP" --exclude-drafts --json tagName --jq '.[].tagName'); do
    zip="ShambConkins_${tag}_pwa.zip"
    if ! gh release download "$tag" --pattern "$zip" --dir "$TMP"; then echo "release $tag: no $zip"; continue; fi
    unzip -q "$TMP/$zip" "*/a/*" -d "$TMP/$tag" 2>/dev/null || true
    n=0; for f in "$TMP/$tag"/*/a/*; do [ -f "$f" ] || continue; cp "$f" "$OUT"/; n=$((n+1)); done
    echo "from release $tag: $n files"; rm -rf "$TMP/$tag" "$TMP/$zip"
  done
  rm -rf "$TMP"
fi
count=$(find "$OUT" -type f | wc -l)
big=$(find "$OUT" -type f -size +25M | head -n 5)
echo "cloudflare/public/a: $count files, $(du -sh "$OUT" | cut -f1)"
if [ -n "$big" ]; then echo "::error::Cloudflare takes files up to 25 MiB; too big: $big"; exit 1; fi
if [ "$count" -gt 19000 ]; then echo "::error::$count files; Cloudflare takes 20,000 per deploy"; exit 1; fi
