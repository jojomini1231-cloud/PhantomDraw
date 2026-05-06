#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3008/api}"

curl -fsS "$API_BASE_URL/health/live" >/dev/null
curl -fsS "$API_BASE_URL/health/ready" >/dev/null

echo "Health checks passed for $API_BASE_URL"
