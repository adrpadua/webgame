#!/usr/bin/env bash
# Installs the repository's git hooks. Run once per clone:
#
#   cd web && npm run hooks:install
#
# It points core.hooksPath at web/scripts/hooks, so the hooks are versioned
# with the repo rather than living untracked in .git/hooks where nobody can
# review them and a fresh clone silently has none.
set -euo pipefail

repo_root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
git -C "$repo_root" config core.hooksPath web/scripts/hooks
chmod +x "$repo_root/web/scripts/hooks/pre-push"

echo "core.hooksPath -> web/scripts/hooks"
echo "pre-push will run: npm run verify:local (in web/)"
echo
echo "To skip it for one push (a docs-only branch, a work-in-progress"
echo "branch nobody will open a pull request from):"
echo "  git push --no-verify"
