#!/bin/bash
set -euo pipefail
PROJECT_ROOT="/home/rxfxtuna/rxfx-logbook-admin"
cd "$PROJECT_ROOT"

if [[ -z "${VITE_API_URL:-}" || "${VITE_API_URL}" != https://* ]]; then
  echo "ERROR: VITE_API_URL must be a public HTTPS backend before building the APK."
  echo "Example: VITE_API_URL=https://your-admin-domain.example.com ./build-apk.sh"
  exit 1
fi

npm run build
npx cap sync android
cd android
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
rm -rf .gradle 2>/dev/null || true
./gradlew assembleDebug --no-daemon
mkdir -p "$PROJECT_ROOT"
cp app/build/outputs/apk/debug/app-debug.apk "$PROJECT_ROOT/RxFx-Admin-debug.apk"
echo "APK: $PROJECT_ROOT/RxFx-Admin-debug.apk"
ls -lh app/build/outputs/apk/debug/app-debug.apk "$PROJECT_ROOT/RxFx-Admin-debug.apk"
