#!/usr/bin/env bash
# Build OneScreen.app (menu bar only, no Dock icon) into target/release/bundle/.
#
#   ./scripts/bundle-macos.sh             # for this Mac's architecture
#   ./scripts/bundle-macos.sh --universal # Apple Silicon + Intel in one app
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="$(sed -n 's/^version = "\(.*\)"/\1/p' Cargo.toml | head -n1)"
OUT="target/release/bundle"
APP="$OUT/OneScreen.app"

if [[ "${1:-}" == "--universal" ]]; then
  rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null
  cargo build --release -p onescreen --target aarch64-apple-darwin
  cargo build --release -p onescreen --target x86_64-apple-darwin
  mkdir -p target/release
  lipo -create \
    target/aarch64-apple-darwin/release/onescreen \
    target/x86_64-apple-darwin/release/onescreen \
    -output target/release/onescreen-universal
  BIN="target/release/onescreen-universal"
else
  cargo build --release -p onescreen
  BIN="target/release/onescreen"
fi

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/OneScreen"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>OneScreen</string>
  <key>CFBundleDisplayName</key><string>OneScreen</string>
  <key>CFBundleIdentifier</key><string>io.github.mxnyawi.onescreen</string>
  <key>CFBundleExecutable</key><string>OneScreen</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${VERSION}</string>
  <key>CFBundleVersion</key><string>${VERSION}</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>MIT licensed. github.com/mxnyawi/OneScreen</string>
</dict>
</plist>
PLIST

# Ad-hoc signature: required to run on Apple Silicon. Not notarised (see README).
codesign --force --deep --sign - "$APP"

echo "Built $APP (v$VERSION)"
