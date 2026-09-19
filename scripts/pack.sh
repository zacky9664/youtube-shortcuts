#!/usr/bin/env bash
# Build a Chrome Web Store upload zip (extension root at zip top level).
# Strips manifest "key" (required for store upload; kept in source for stable unpacked ID).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v zip >/dev/null 2>&1; then
  echo "error: zip is required" >&2
  exit 1
fi

VERSION="$(
  python3 -c "import json; print(json.load(open('manifest.json'))['version'])"
)"
NAME="youtube-shortcuts"
OUT_DIR="build"
STAGE_DIR="${OUT_DIR}/.pack-stage"
OUT_ZIP="${OUT_DIR}/${NAME}-v${VERSION}.zip"

FILES=(
  background/service-worker.js
  content/content.js
  options/popup.html
  options/popup.css
  options/popup.js
  options/options.html
  options/options.css
  options/options.js
  options/shared.js
  icons/icon16.png
  icons/icon32.png
  icons/icon48.png
  icons/icon128.png
)

for f in "${FILES[@]}"; do
  if [[ ! -e "$f" ]]; then
    echo "error: missing required file: $f" >&2
    exit 1
  fi
done

rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/background" "$STAGE_DIR/content" "$STAGE_DIR/options" "$STAGE_DIR/icons"

python3 - <<'PY'
import json
from pathlib import Path
src = json.loads(Path("manifest.json").read_text())
src.pop("key", None)
Path("build/.pack-stage/manifest.json").write_text(
    json.dumps(src, ensure_ascii=False, indent=2) + "\n"
)
PY

for f in "${FILES[@]}"; do
  cp "$f" "$STAGE_DIR/$f"
done

mkdir -p "$OUT_DIR"
rm -f "$OUT_ZIP"

(
  cd "$STAGE_DIR"
  zip -q -X -r "../../${OUT_ZIP}" .
)

rm -rf "$STAGE_DIR"

echo "Created ${OUT_ZIP} ($(wc -c < "$OUT_ZIP" | tr -d ' ') bytes)"
unzip -l "$OUT_ZIP"
