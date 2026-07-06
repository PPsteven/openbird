#!/usr/bin/env bash
# Publish site/ to the gh-pages branch without touching the working tree.
# Uses a throwaway git worktree so uncommitted edits on `main` stay in place.
set -euo pipefail

SITE_DIR="site"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-gh-pages}"
WORKTREE="$(mktemp -d)/openbird-ghpages"

DRY_RUN=0
MSG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift;;
    -m|--message) MSG="$2"; shift 2;;
    -h|--help)
      sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//'
      echo
      echo "Usage: ./publish.sh [--dry-run] [-m \"commit message\"]"
      echo "  --dry-run    show diff but do not commit/push"
      echo "  -m MSG       custom commit message (default: deploy: site update <ts>)"
      exit 0;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

# run from repo root
if [[ ! -d "$SITE_DIR" ]] || ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: run from the repo root (need $SITE_DIR/ + git)" >&2
  exit 1
fi
cd "$(git rev-parse --show-toplevel)"

cleanup() { git worktree remove --force "$WORKTREE" 2>/dev/null || true; }
trap cleanup EXIT

echo ">> preparing temp worktree for $REMOTE/$BRANCH"
git fetch "$REMOTE" "$BRANCH" --quiet
# detach on remote tip so we never collide with a checked-out gh-pages anywhere
git worktree add --detach "$WORKTREE" "$REMOTE/$BRANCH" >/dev/null

echo ">> syncing $SITE_DIR/ -> $BRANCH root (extra files on $BRANCH are preserved)"
cp -p "$SITE_DIR"/* "$WORKTREE"/

cd "$WORKTREE"
if git diff --quiet; then
  echo ">> no changes to publish"
  exit 0
fi

git --no-pager diff --stat

if [[ $DRY_RUN -eq 1 ]]; then
  echo ">> dry-run: skipping commit/push"
  exit 0
fi

[[ -z "$MSG" ]] && MSG="deploy: site update $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git add -A
git commit -q -m "$MSG"

echo ">> pushing HEAD -> $REMOTE/$BRANCH"
git push "$REMOTE" HEAD:"$BRANCH"
echo ">> done"
