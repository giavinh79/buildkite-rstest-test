#!/usr/bin/env bash

set -euo pipefail

JUNIT_FILE="${JUNIT_OUTPUT:-./reports/junit.xml}"

if [[ -z "${BUILDKITE_ANALYTICS_TOKEN:-}" ]]; then
  echo "BUILDKITE_ANALYTICS_TOKEN is required to upload JUnit results."
  exit 1
fi

if [[ ! -f "$JUNIT_FILE" ]]; then
  echo "JUnit file not found: $JUNIT_FILE"
  exit 1
fi

curl \
  --fail-with-body \
  -X POST \
  -H "Authorization: Token token=\"$BUILDKITE_ANALYTICS_TOKEN\"" \
  -F "data=@$JUNIT_FILE" \
  -F "format=junit" \
  -F "run_env[CI]=${BUILD_PROVIDER:-manual}" \
  -F "run_env[key]=${BUILD_KEY:-local-$(date +%s)}" \
  -F "run_env[number]=${BUILD_NUMBER:-0}" \
  -F "run_env[branch]=${BUILD_BRANCH:-$(git branch --show-current 2>/dev/null || echo local)}" \
  -F "run_env[commit_sha]=${BUILD_COMMIT:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}" \
  -F "run_env[url]=${BUILD_URL:-https://github.com/giavinh79/buildkite-rstest-test}" \
  https://analytics-api.buildkite.com/v1/uploads
