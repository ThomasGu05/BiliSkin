#!/usr/bin/env bash
# 用独立的临时 Chrome 配置启动一个已加载本扩展的窗口（方便试用，不影响日常浏览器配置）。
# 用法: bash tools/launch-chrome.sh [浏览器]   浏览器可选 chrome / edge / brave / chromium
set -euo pipefail

EXT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE_DIR="${TMPDIR:-/tmp}/bili-skin-preview-profile"
SITE="${1:-}"

pick_browser() {
  case "${1:-chrome}" in
    chrome) echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ;;
    edge) echo "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" ;;
    brave) echo "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" ;;
    chromium) echo "/Applications/Chromium.app/Contents/MacOS/Chromium" ;;
    *) echo "" ;;
  esac
}

BROWSER="$(pick_browser "$SITE")"
if [[ -z "$BROWSER" || ! -x "$BROWSER" ]]; then
  for cand in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
              "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
              "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
              "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
    if [[ -x "$cand" ]]; then BROWSER="$cand"; break; fi
  done
fi
if [[ -z "${BROWSER:-}" || ! -x "$BROWSER" ]]; then
  echo "未找到 Chrome / Edge / Brave / Chromium，请手动在 chrome://extensions 加载本目录。" >&2
  exit 1
fi

echo "浏览器: $BROWSER"
echo "扩展目录: $EXT_DIR"
echo "配置目录: $PROFILE_DIR"

if pgrep -x "Google Chrome" >/dev/null 2>&1; then
  echo "提示: Chrome 已在运行，本窗口使用独立配置，不会影响你原有的书签和扩展。"
fi

"$BROWSER" \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disable-search-engine-choice-screen \
  --disable-extensions-except="$EXT_DIR" \
  --load-extension="$EXT_DIR" \
  "https://www.bilibili.com/" >/dev/null 2>&1 &
disown || true
echo "已启动。首次使用可在右上角扩展栏找到「B站自定义皮肤」图标。"
