#!/usr/bin/env bash
# Browser tests against the production build (as before every deploy): builds, then runs the
# Playwright tests in e2e/ (playwright.config.ts starts the standalone server on port 3100 with a
# test admin and a fresh DB via scripts/e2e-server.sh) and stores the screenshots for the docs.
# Usage: ./scripts/smoke.sh [screenshot-dir]   (default: docs/screenshots)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-docs/screenshots}"

# Clean build: a stale Turbopack cache in .next/ has dropped CSS changes before.
rm -rf .next
npm run build
mkdir -p "$OUT"
SHOTS_DIR="$OUT" npx playwright test
