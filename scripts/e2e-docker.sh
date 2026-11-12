#!/usr/bin/env bash
# Run the Playwright end-to-end tests inside Microsoft's official Playwright image, so
# browsers and system libraries are identical on every machine and in CI.
#
# The image tag is derived from the locked @playwright/test version, so the two can't
# drift apart. node_modules lives in a Docker volume (keyed by the lockfile) so the host's
# platform-specific binaries are never shared with the Linux container.
#
# Usage: scripts/e2e-docker.sh [extra playwright args...]
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p "require('./package-lock.json').packages['node_modules/@playwright/test'].version")
image="mcr.microsoft.com/playwright:v${version}-noble"
lockhash=$(node -p "require('crypto').createHash('sha256').update(require('fs').readFileSync('package-lock.json')).digest('hex').slice(0,12)")
volume="simple-householder-node-modules-${lockhash}"

tty_flag=()
[ -t 1 ] && tty_flag=(-t)

echo "▶ Playwright ${version} in ${image}"
docker run --rm "${tty_flag[@]}" --init --ipc=host \
  -e CI="${CI:-}" \
  -v "$PWD":/work \
  -v "${volume}":/work/node_modules \
  -w /work \
  "$image" \
  bash -c '
    set -e
    [ -f node_modules/.installed ] || { npm ci --no-audit --no-fund --ignore-scripts && touch node_modules/.installed; }
    status=0
    npx playwright test "$@" || status=$?
    chown -R '"$(id -u):$(id -g)"' test-results playwright-report dist dist-single 2>/dev/null || true
    exit $status
  ' bash "$@"
