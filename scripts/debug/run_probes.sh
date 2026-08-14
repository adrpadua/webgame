#!/usr/bin/env bash
# Manifest-driven Probe suite runner — POSIX adapter (ADR 0018).
#
# Registration lives in scripts/debug/probes.manifest (lane|name|script|marker).
# A probe passes only when Godot exits 0, its output contains the declared
# marker, and no engine error or failed assertion appears. Runs the `default`
# and `scenario` lanes unless probe names are given; `manual` and `tool` lanes
# are reported as skipped, never silently dropped.
#
# Usage: scripts/debug/run_probes.sh [-m <manifest>] [-g <godot>] [name ...]
set -u

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
MANIFEST="$REPO/scripts/debug/probes.manifest"
GODOT_BIN="${GODOT:-}"
QUIT_AFTER=900
PROBE_TIMEOUT="${PROBE_TIMEOUT:-240}"

while getopts "m:g:" option; do
	case "$option" in
		m) MANIFEST="$OPTARG" ;;
		g) GODOT_BIN="$OPTARG" ;;
		*) echo "Usage: $0 [-m manifest] [-g godot] [name ...]" >&2; exit 2 ;;
	esac
done
shift $((OPTIND - 1))
REQUESTED=("$@")

if [ -z "$GODOT_BIN" ]; then
	for candidate in godot godot4; do
		if command -v "$candidate" >/dev/null 2>&1; then
			GODOT_BIN="$candidate"
			break
		fi
	done
fi
if [ -z "$GODOT_BIN" ]; then
	echo "Godot executable not found. Add godot to PATH, set GODOT, or pass -g <path>." >&2
	exit 2
fi
if [ ! -f "$MANIFEST" ]; then
	echo "Probe manifest not found: $MANIFEST" >&2
	exit 2
fi

is_requested() {
	if [ ${#REQUESTED[@]} -eq 0 ]; then
		return 1
	fi
	for wanted in "${REQUESTED[@]}"; do
		if [ "$wanted" = "$1" ]; then
			return 0
		fi
	done
	return 2
}

pass=0
fail=0
skipped=""
failed_names=""

while IFS='|' read -r lane name script marker; do
	case "$lane" in
		""|\#*) continue ;;
	esac
	run_probe=0
	if [ ${#REQUESTED[@]} -gt 0 ]; then
		is_requested "$name"
		case $? in
			0) run_probe=1 ;;
			*) continue ;;
		esac
	else
		case "$lane" in
			default|scenario) run_probe=1 ;;
			*) skipped="$skipped $name($lane)"; continue ;;
		esac
	fi
	[ $run_probe -eq 1 ] || continue
	output="$(cd "$REPO" && timeout "$PROBE_TIMEOUT" "$GODOT_BIN" --headless --path "$REPO" --script "$script" --quit-after "$QUIT_AFTER" 2>&1)"
	code=$?
	verdict="ok"
	if [ $code -ne 0 ]; then
		verdict="FAIL(exit=$code)"
	elif printf '%s' "$output" | grep -qE 'SCRIPT ERROR:|^ERROR:|Assertion failed'; then
		verdict="FAIL(errors)"
	elif [ -n "$marker" ] && ! printf '%s' "$output" | grep -qF "$marker"; then
		verdict="FAIL(missing marker $marker)"
	fi
	if [ "$verdict" = "ok" ]; then
		pass=$((pass + 1))
		echo "ok   [$name] $marker"
	else
		fail=$((fail + 1))
		failed_names="$failed_names $name"
		echo "FAIL [$name] $verdict"
		printf '%s\n' "$output" | grep -E 'SCRIPT ERROR:|^ERROR:|Assertion failed' | head -6 | sed 's/^/     /'
	fi
done < "$MANIFEST"

if [ -n "$skipped" ]; then
	echo "skipped lanes:$skipped"
fi
if [ $fail -gt 0 ]; then
	echo "PROBE_SUITE_FAILED pass=$pass fail=$fail failed:$failed_names"
	exit 1
fi
if [ $pass -eq 0 ]; then
	echo "PROBE_SUITE_FAILED no probes matched the request"
	exit 1
fi
echo "PROBE_SUITE_OK count=$pass"
