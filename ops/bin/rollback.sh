#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_ROOT="${DEPLOY_ROOT:-$PROJECT_ROOT/ops/releases}"
CURRENT_LINK="$DEPLOY_ROOT/current"
PREVIOUS_LINK="$DEPLOY_ROOT/previous"

if [[ ! -L "$PREVIOUS_LINK" ]]; then
  echo "No previous release found."
  exit 1
fi

PREVIOUS_TARGET="$(readlink -f "$PREVIOUS_LINK")"
VERSION="$(basename "$PREVIOUS_TARGET")"

ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK"

export APP_VERSION="$VERSION"
docker compose -f "$CURRENT_LINK/docker-compose.yml" up -d --build --remove-orphans

echo "Rollback completed: $VERSION"
