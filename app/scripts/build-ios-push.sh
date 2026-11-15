#!/bin/bash
# Build a push-capable device binary from a Firebase client plist for this bundle.
set -eu
if [[ $# -lt 2 ]]; then
  echo 'Usage: build-ios-push.sh GoogleService-Info.plist https://server [local-CA.der]' >&2
  exit 2
fi
plist=$1
api_base=$2
case "$api_base" in https://*) ;; *) echo 'HTTPS required' >&2; exit 2;; esac
read_value() { /usr/libexec/PlistBuddy -c "Print :$1" "$plist"; }
[[ "$(read_value BUNDLE_ID)" == com.aleks48.fixlyapp ]] || { echo 'Wrong iOS bundle ID' >&2; exit 2; }
args=(--dart-define="API_BASE_URL=$api_base" --dart-define="FIREBASE_IOS_APP_ID=$(read_value GOOGLE_APP_ID)"
  --dart-define="FIREBASE_IOS_API_KEY=$(read_value API_KEY)" --dart-define="FIREBASE_SENDER_ID=$(read_value GCM_SENDER_ID)"
  --dart-define="FIREBASE_PROJECT_ID=$(read_value PROJECT_ID)")
if [[ $# -gt 2 ]]; then
  args+=(-t lib/main_fixly_lan.dart --dart-define="FIXLY_LAN_CA_DER=$(openssl base64 -A -in "$3")")
fi
cd "$(dirname "$0")/.."
mkdir -p ios/Flutter/ephemeral
cat > ios/Flutter/ephemeral/FixlyPush.xcconfig <<'CONFIG'
FIXLY_ENTITLEMENTS = Runner/RunnerPush.entitlements
FIXLY_APS_ENVIRONMENT = development
CONFIG
flutter build ios --release --no-codesign "${args[@]}"
