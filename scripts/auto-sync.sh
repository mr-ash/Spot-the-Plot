#!/usr/bin/env bash
set -euo pipefail

INTERVAL_SECONDS="${1:-10}"
BRANCH="${BRANCH:-main}"
COMMIT_PREFIX="${COMMIT_PREFIX:-chore: auto-sync}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "Auto-sync started for $(pwd)"
echo "Branch: ${BRANCH}"
echo "Interval: ${INTERVAL_SECONDS}s"

while true; do
  has_unstaged_changes=0
  has_untracked_files=0

  if ! git diff --quiet; then
    has_unstaged_changes=1
  fi

  if [ -n "$(git ls-files --others --exclude-standard)" ]; then
    has_untracked_files=1
  fi

  if [ "$has_unstaged_changes" -eq 1 ] || [ "$has_untracked_files" -eq 1 ]; then
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"

    git add -A
    if ! git diff --cached --quiet; then
      git commit -m "${COMMIT_PREFIX} (${timestamp})" || true
      if git pull --rebase origin "$BRANCH"; then
        git push origin "$BRANCH"
      else
        echo "Auto-sync warning: pull --rebase failed. Resolve conflicts manually."
      fi
    fi
  fi

  sleep "$INTERVAL_SECONDS"
done
