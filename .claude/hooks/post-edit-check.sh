#!/usr/bin/env bash
# PostToolUse hook: after Claude edits a TypeScript file, typecheck and run the
# unit tests. Exit code 2 feeds the failure back to Claude so it fixes it straight away.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if ! out=$(npx tsc --noEmit 2>&1); then
  echo "Typecheck failed after editing $file:" >&2
  echo "$out" | tail -40 >&2
  exit 2
fi

if ! out=$(npx vitest run --reporter=dot 2>&1); then
  echo "Unit tests failed after editing $file:" >&2
  echo "$out" | tail -60 >&2
  exit 2
fi
exit 0
