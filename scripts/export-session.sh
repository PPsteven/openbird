#!/usr/bin/env bash
set -euo pipefail

SPEC_NAME="${1:-}"
OUT_DIR="docs/history"

if [ -z "$SPEC_NAME" ]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  SPEC_NAME="$BRANCH"
fi

mkdir -p "$OUT_DIR"

SESSIONS=$(opencode session list --format json 2>/dev/null || echo "[]")
if [ "$SESSIONS" = "[]" ] || [ -z "$SESSIONS" ]; then
  echo "ERROR: No sessions found" >&2
  exit 1
fi

SESSION_ID=$(echo "$SESSIONS" | python3 -c "
import json, sys
sessions = json.load(sys.stdin)
if sessions:
  print(sessions[0]['id'])
" 2>/dev/null || echo "")

if [ -z "$SESSION_ID" ]; then
  echo "ERROR: Could not determine current session ID" >&2
  exit 1
fi

OUTFILE="${OUT_DIR}/${SPEC_NAME}.json"
echo "Exporting session ${SESSION_ID} -> ${OUTFILE} ..."
opencode export "$SESSION_ID" --sanitize > "$OUTFILE" 2>/dev/null

if [ -s "$OUTFILE" ]; then
  echo "OK: $(wc -c < "$OUTFILE") bytes written"
else
  echo "ERROR: Export produced empty file" >&2
  rm -f "$OUTFILE"
  exit 1
fi
