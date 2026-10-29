#!/usr/bin/env bash
# Builds the arm64 image on the Mac, copies it to the Pi via SSH and restarts Compose.
# Prerequisites: Docker Desktop is running, `ssh pi` works, ~/darts/.env exists on the Pi (deploy/env.example).
set -euo pipefail
cd "$(dirname "$0")/.."

PI_HOST="${PI_HOST:-pi}"
REMOTE_DIR="${REMOTE_DIR:-darts}"
TAG="$(git rev-parse --short HEAD)$(git diff --quiet || echo '-dirty')"
IMAGE="darts-app:${TAG}"

echo "▶ build ${IMAGE} (linux/arm64)"
docker buildx build --platform linux/arm64 -t "${IMAGE}" --load .

echo "▶ transfer to ${PI_HOST}"
docker save "${IMAGE}" | gzip | ssh "${PI_HOST}" "docker load"
ssh "${PI_HOST}" "mkdir -p ${REMOTE_DIR}/data"
scp -q docker-compose.yml Caddyfile "${PI_HOST}:${REMOTE_DIR}/"

echo "▶ start"
ssh "${PI_HOST}" "cd ${REMOTE_DIR} && grep -q '^IMAGE_TAG=' .env && sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=${TAG}/' .env || echo 'IMAGE_TAG=${TAG}' >> .env; docker compose up -d --remove-orphans && docker image prune -f >/dev/null"

echo "▶ health"
sleep 5
# App directly in the Compose network (behind Caddy) and Caddy from outside: without a session / must redirect to /login (307).
ssh "${PI_HOST}" "cd ${REMOTE_DIR} && echo \"app:   \$(docker compose exec -T caddy wget -qO- http://app:3000/api/health || echo FAIL)\"; echo \"caddy: HTTP \$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/) (307 = login redirect active)\""
echo "done: ${IMAGE}"
