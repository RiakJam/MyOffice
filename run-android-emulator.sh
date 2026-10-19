#!/usr/bin/env bash
set -euo pipefail

SDK_ROOT="${ANDROID_HOME:-$HOME/.local/share/myoffice-build-tools/sdk}"
EMULATOR="$SDK_ROOT/emulator/emulator"
ADB="$SDK_ROOT/platform-tools/adb"

if [[ ! -x "$EMULATOR" || ! -x "$ADB" ]]; then
  echo "Android emulator tools are missing from $SDK_ROOT" >&2
  exit 1
fi

if "$ADB" devices | grep -q '^emulator-.*device$'; then
  echo "An Android emulator is already running."
  exit 0
fi

exec "$EMULATOR" -avd Myoffice_Light_API34 -gpu swiftshader_indirect \
  -no-snapshot -no-boot-anim -no-audio -cores 2 -no-metrics
