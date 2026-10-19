#!/usr/bin/env bash
set -e
app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_binary="$app_dir/dist/linux-unpacked/myoffice"
if [[ ! -x "$app_binary" ]]; then
  echo "Myoffice desktop build is missing. Run npm run build:desktop in $app_dir first." >&2
  exit 1
fi
unset ELECTRON_RUN_AS_NODE
exec "$app_binary" "$@"
