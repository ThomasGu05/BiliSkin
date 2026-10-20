#!/usr/bin/env bash
# 打包成可上传/分发的 zip（Chrome 网上应用店或直接分享离线安装包）
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$HERE/dist"
NAME="bili-skin"
VERSION="$(python3 -c "import json;print(json.load(open('$HERE/manifest.json'))['version'])")"

mkdir -p "$OUT"
rm -f "$OUT/$NAME-v$VERSION.zip"

cd "$HERE"
zip -r -q "$OUT/$NAME-v$VERSION.zip" \
  manifest.json background.js popup.html popup.css popup.js \
  src icons docs README.md LICENSE \
  -x '*.DS_Store' -x '__MACOSX*'

echo "✅ 打包完成: $OUT/$NAME-v$VERSION.zip"
unzip -l "$OUT/$NAME-v$VERSION.zip" | tail -5
