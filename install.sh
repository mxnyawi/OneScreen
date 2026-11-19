#!/usr/bin/env bash
# Install OneScreen on macOS with one command:
#
#   curl -fsSL https://raw.githubusercontent.com/mxnyawi/OneScreen/main/install.sh | bash
#
# Downloads the latest release, puts OneScreen.app in /Applications (or ~/Applications
# if that isn't writable), starts it, and turns on launch at login. Run it again to
# update. To remove OneScreen:
#
#   curl -fsSL https://raw.githubusercontent.com/mxnyawi/OneScreen/main/install.sh | bash -s -- --uninstall
set -euo pipefail

REPO="mxnyawi/OneScreen"
URL="https://github.com/$REPO/releases/latest/download/OneScreen-macOS.zip"
AGENT="$HOME/Library/LaunchAgents/io.github.mxnyawi.onescreen.plist"

say() { printf '\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "This installer is for macOS. On Windows, see the README for the PowerShell command."

existing_app() {
  for d in /Applications "$HOME/Applications"; do
    [[ -d "$d/OneScreen.app" ]] && { echo "$d/OneScreen.app"; return; }
  done
  return 0
}

stop_running() {
  pkill -x OneScreen 2>/dev/null || true
  sleep 0.5
}

if [[ "${1:-}" == "--uninstall" ]]; then
  stop_running
  app="$(existing_app)"
  [[ -n "$app" ]] && rm -rf "$app"
  rm -f "$AGENT"
  say "OneScreen removed. Your settings are in ~/Library/Application Support/OneScreen (delete that folder too if you like)."
  exit 0
fi

DEST="/Applications"
[[ -w "$DEST" ]] || DEST="$HOME/Applications"
mkdir -p "$DEST"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

say "Downloading OneScreen..."
if [[ -n "${ONESCREEN_ZIP:-}" ]]; then
  cp "$ONESCREEN_ZIP" "$TMP/OneScreen.zip" # used by CI to test a fresh build
else
  curl -fL --progress-bar "$URL" -o "$TMP/OneScreen.zip" \
    || fail "Download failed. Check your connection, or see https://github.com/$REPO/releases"
fi
ditto -x -k "$TMP/OneScreen.zip" "$TMP"
[[ -d "$TMP/OneScreen.app" ]] || fail "The download didn't contain OneScreen.app."

stop_running
old="$(existing_app)"
[[ -n "$old" ]] && rm -rf "$old"
mv "$TMP/OneScreen.app" "$DEST/OneScreen.app"
# curl downloads aren't quarantined, but clear it in case a browser copy was there before
xattr -dr com.apple.quarantine "$DEST/OneScreen.app" 2>/dev/null || true

say "Starting OneScreen..."
open "$DEST/OneScreen.app" --args --launch-at-login

say "Done. OneScreen is running: look for the two-screens icon in your menu bar."
echo "To use it, push your cursor toward your monitor. It starts automatically when you log in."
