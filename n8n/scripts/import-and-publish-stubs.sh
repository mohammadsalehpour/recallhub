#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.yml"

docker compose -f "$COMPOSE_FILE" --profile tools run --rm n8n-import

workflow_ids="$(
  STUB_DIR="$ROOT_DIR/n8n/workflows/stubs" node <<'NODE'
const fs = require('fs');
const path = require('path');

const stubDir = process.env.STUB_DIR;
for (const file of fs.readdirSync(stubDir).filter((name) => name.endsWith('.json')).sort()) {
  const workflow = JSON.parse(fs.readFileSync(path.join(stubDir, file), 'utf8'));
  if (!workflow.id) {
    throw new Error(`${file} is missing a stable workflow id`);
  }
  if (workflow.active) {
    process.stdout.write(`${workflow.id}\n`);
  }
}
NODE
)"

while IFS= read -r workflow_id; do
  [ -n "$workflow_id" ] || continue
  docker compose -f "$COMPOSE_FILE" --profile tools run --rm n8n-import publish:workflow --id="$workflow_id" </dev/null
done <<< "$workflow_ids"

legacy_stub_ids=(
  "sht0apInw9CF46Iw"
  "IpBkARk2I7109NoM"
  "16ZRbqgxrCsaUiwd"
  "cM2kZgDcSSzpQrUZ"
  "kUgxTjlyapAXQrOC"
  "VWva3n61uTGYonCb"
)

for workflow_id in "${legacy_stub_ids[@]}"; do
  docker compose -f "$COMPOSE_FILE" --profile tools run --rm n8n-import update:workflow --id="$workflow_id" --active=false </dev/null >/dev/null 2>&1 || true
done

docker compose -f "$COMPOSE_FILE" restart n8n
