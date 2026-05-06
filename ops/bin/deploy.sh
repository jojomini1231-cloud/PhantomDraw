#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: deploy.sh <version>

Environment:
  DEPLOY_ROOT    Base directory for releases. Default: ./ops/releases
  COMPOSE_FILE   Compose file to deploy. Default: ./docker-compose.yml
EOF
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

VERSION="$1"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_ROOT="${DEPLOY_ROOT:-$PROJECT_ROOT/ops/releases}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_ROOT/docker-compose.yml}"
RELEASE_DIR="$DEPLOY_ROOT/$VERSION"
CURRENT_LINK="$DEPLOY_ROOT/current"
PREVIOUS_LINK="$DEPLOY_ROOT/previous"

mkdir -p "$DEPLOY_ROOT"
mkdir -p "$RELEASE_DIR"

cp "$COMPOSE_FILE" "$RELEASE_DIR/docker-compose.yml"
# Keep compose-relative bind mounts working (e.g. ./ops/monitoring/*).
mkdir -p "$RELEASE_DIR/ops"
rm -rf "$RELEASE_DIR/ops/monitoring"
cp -R "$PROJECT_ROOT/ops/monitoring" "$RELEASE_DIR/ops/monitoring"

if [[ -L "$CURRENT_LINK" ]]; then
  CURRENT_TARGET="$(readlink -f "$CURRENT_LINK")"
  ln -sfn "$CURRENT_TARGET" "$PREVIOUS_LINK"
fi

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

export APP_VERSION="$VERSION"
docker compose -f "$CURRENT_LINK/docker-compose.yml" pull --ignore-pull-failures
docker compose -f "$CURRENT_LINK/docker-compose.yml" up -d --build --remove-orphans

echo "Deployment completed: $VERSION"
