#!/usr/bin/env bash
# Browser run against the production build (as before every deploy):
# builds, starts the standalone server on port 3100 with a test admin and a fresh DB,
# runs scripts/smoke-match.mjs and stores the screenshots (default: docs/screenshots).
# Usage: ./scripts/smoke.sh [screenshot-dir]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-docs/screenshots}"
SA="${SA_DIR:-/tmp/sa}"
PORT="${PORT:-3100}"

# Clean build: a stale Turbopack cache in .next/ has dropped CSS changes before.
rm -rf .next
npm run build
rm -rf "$SA" && cp -R .next/standalone "$SA" && mkdir -p "$SA/.next" && cp -R .next/static "$SA/.next/static" && cp -R public drizzle "$SA/"

HASH="$(node -e "console.log(require('bcryptjs').hashSync('admin-secret', 4))")"
kill_port() { command -v lsof > /dev/null && lsof -ti ":$PORT" | xargs -r kill || true; }
kill_port
(cd "$SA" && PORT="$PORT" HOSTNAME=127.0.0.1 DATABASE_PATH="$SA/darts.db" ADMIN_USER=admin ADMIN_PASSWORD_HASH="$HASH" COOKIE_SECURE=false node server.js > "$SA/server.log" 2>&1 &)
for _ in $(seq 1 30); do curl -sf "http://127.0.0.1:$PORT/api/health" > /dev/null && break; sleep 1; done

mkdir -p "$OUT"
status=0
BASE_URL="http://localhost:$PORT" ADMIN_USER=admin ADMIN_PASSWORD=admin-secret node scripts/smoke-match.mjs "$OUT" || status=$?
kill_port
echo "Screenshots: $OUT (server log: $SA/server.log)"
exit $status
