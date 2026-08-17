#!/usr/bin/env bash
# Fetch and cache a headless-capable Godot binary matching project.godot,
# then run the project import so probes can run in a fresh environment.
#
# Usage: scripts/debug/setup_headless_godot.sh [cache_dir]
#   Prints the binary path on success. Compose with the probe runner:
#     GODOT="$(scripts/debug/setup_headless_godot.sh)" scripts/debug/run_probes.sh
set -eu

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
CACHE="${1:-${GODOT_CACHE_DIR:-$HOME/.cache/webgame-godot}}"
VERSION="$(sed -n 's/^config\/features=PackedStringArray("\([0-9.]*\)").*$/\1/p' "$REPO/project.godot")"
[ -n "$VERSION" ] || { echo "Could not read Godot version from project.godot" >&2; exit 2; }

ARCH="$(uname -m)"
case "$ARCH" in
	x86_64) SUFFIX="linux.x86_64" ;;
	aarch64) SUFFIX="linux.arm64" ;;
	*) echo "Unsupported architecture: $ARCH" >&2; exit 2 ;;
esac

BIN="$CACHE/Godot_v${VERSION}-stable_${SUFFIX}"
if [ ! -x "$BIN" ]; then
	mkdir -p "$CACHE"
	URL="https://github.com/godotengine/godot/releases/download/${VERSION}-stable/Godot_v${VERSION}-stable_${SUFFIX}.zip"
	echo "Fetching Godot ${VERSION} (${URL})..." >&2
	curl -sSL --max-time 600 -o "$CACHE/godot.zip" "$URL"
	unzip -o -q "$CACHE/godot.zip" -d "$CACHE"
	rm -f "$CACHE/godot.zip"
	[ -x "$BIN" ] || { echo "Download did not produce $BIN" >&2; exit 2; }
fi

# First-run resource import (idempotent; required before headless --script runs).
if [ ! -d "$REPO/.godot/imported" ]; then
	"$BIN" --headless --path "$REPO" --import >&2 || true
fi

echo "$BIN"
