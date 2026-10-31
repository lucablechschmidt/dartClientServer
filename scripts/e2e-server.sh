#!/usr/bin/env bash
# Server for the browser tests (playwright.config.ts starts it): copies the existing production
# build into SA_DIR, takes a fresh database and runs the standalone server in the foreground with
# a test admin (admin / admin-secret). Build first: `npm run build` (scripts/smoke.sh does both).
set -euo pipefail
cd "$(dirname "$0")/.."
SA="${SA_DIR:-/tmp/sa}"
PORT="${PORT:-3100}"

if [ ! -f .next/standalone/server.js ]; then
  echo "No production build in .next/standalone; run 'npm run build' first." >&2
  exit 1
fi
rm -rf "$SA" && cp -R .next/standalone "$SA" && mkdir -p "$SA/.next" && cp -R .next/static "$SA/.next/static" && cp -R public drizzle "$SA/"

HASH="$(node -e "console.log(require('bcryptjs').hashSync(process.env.ADMIN_PASSWORD || 'admin-secret', 4))")"
cd "$SA"
exec env PORT="$PORT" HOSTNAME=127.0.0.1 DATABASE_PATH="$SA/darts.db" ADMIN_USER="${ADMIN_USER:-admin}" ADMIN_PASSWORD_HASH="$HASH" \
  APP_URL="http://localhost:$PORT" COOKIE_SECURE=false node server.js
