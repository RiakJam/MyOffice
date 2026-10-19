#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

npm run build
npx electron-builder --win dir --x64

if command -v makensis >/dev/null 2>&1; then
  nsis_binary="$(command -v makensis)"
else
  nsis_cache="${XDG_CACHE_HOME:-$HOME/.cache}/electron-builder"
  nsis_binary="$(find "$nsis_cache" -type f -path '*/linux/makensis' -print -quit 2>/dev/null || true)"
fi

if [[ -z "$nsis_binary" ]]; then
  echo "NSIS is required. Install it with: sudo apt install nsis" >&2
  exit 1
fi

"$nsis_binary" \
  -DINPUT_DIR="$project_dir/dist/win-unpacked" \
  -DOUTPUT_FILE="$project_dir/dist/Myoffice-Setup-Windows-x64.exe" \
  -DICON_FILE="$project_dir/build/icon.ico" \
  -DDISPLAY_VERSION="$(node -p 'require("./package.json").version')" \
  "$project_dir/packaging/windows-installer.nsi"

echo "Windows installer: $project_dir/dist/Myoffice-Setup-Windows-x64.exe"
