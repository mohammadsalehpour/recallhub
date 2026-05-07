#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Checking Appsmith JSON artifacts..."
find "$ROOT_DIR" \
  \( -path "$ROOT_DIR/*.json" -o -path "$ROOT_DIR/queries/*.json" -o -path "$ROOT_DIR/config/*.json" -o -path "$ROOT_DIR/pages/*.json" -o -path "$ROOT_DIR/application.manifest.json" \) \
  -print0 |
  xargs -0 -I{} node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" {}

echo "Checking JS Object syntax..."
find "$ROOT_DIR/jsobjects" -name '*.js' -print0 |
  xargs -0 -I{} node --input-type=module -e "import { readFileSync } from 'node:fs'; await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(readFileSync(process.argv[1], 'utf8')))" {}

echo "Checking no direct n8n URL is present in runnable artifacts..."
if rg -n "localhost:5678|n8n:5678|/webhook/|N8N_INTERNAL_BASE_URL" \
  "$ROOT_DIR/queries" "$ROOT_DIR/jsobjects" "$ROOT_DIR/config" "$ROOT_DIR/pages" "$ROOT_DIR/application.manifest.json" "$ROOT_DIR/RecallHub_Control_Plane.json"; then
  echo "Direct n8n reference found in Appsmith runnable artifacts." >&2
  exit 1
fi

echo "Checking no database datasource or SQL is present..."
if rg -n "postgres|mysql|mongodb|SELECT |INSERT |UPDATE |DELETE |CREATE TABLE|ALTER TABLE|DROP TABLE" \
  "$ROOT_DIR/queries" "$ROOT_DIR/jsobjects" "$ROOT_DIR/config" "$ROOT_DIR/pages" "$ROOT_DIR/application.manifest.json" "$ROOT_DIR/RecallHub_Control_Plane.json"; then
  echo "Database/SQL reference found in Appsmith runnable artifacts." >&2
  exit 1
fi

echo "Checking no hard-coded bearer token is present..."
if rg -n "Bearer [A-Za-z0-9._~+/=-]{16,}" "$ROOT_DIR/queries" "$ROOT_DIR/jsobjects" "$ROOT_DIR/config" "$ROOT_DIR/pages" "$ROOT_DIR/RecallHub_Control_Plane.json"; then
  echo "Hard-coded bearer token found." >&2
  exit 1
fi

echo "Appsmith contract checks passed."
