#!/usr/bin/env bash
# All check steps in one script (architecture.md E15): .github/workflows/ci.yml
# only calls this script, so the content moves along when switching platforms.
# Locally: ./scripts/ci.sh   (matches what has to run before every deploy)
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n▶ %s\n' "$*"; }

step "install"
if [ -n "${NPM_CACHE:-}" ]; then npm ci --no-audit --no-fund --cache "$NPM_CACHE"; else npm ci --no-audit --no-fund; fi

# Known vulnerabilities in runtime dependencies only; dev-tool advisories do not block.
step "audit";     npm audit --omit=dev --audit-level=high
step "format";    npm run format:check
step "lint";      npm run lint
step "typecheck"; npm run typecheck
step "test";      npm run test:coverage   # tests plus coverage thresholds (vitest.config.mts)

# Browser run against the production build (builds it itself). Chromium must be installed:
# locally run `npx playwright install chromium` once; in CI the Playwright image ships it.
step "smoke";     ./scripts/smoke.sh "${SMOKE_OUT:-docs/screenshots}"

step "done"
