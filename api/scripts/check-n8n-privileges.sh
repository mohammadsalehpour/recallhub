#!/usr/bin/env bash
set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-15432}"
PGUSER="${PGUSER:-recallhub}"
PGPASSWORD="${PGPASSWORD:-Aa123456}"
PGDATABASE="${PGDATABASE:-recallhub_db}"

export PGPASSWORD

psql \
  --host "$PGHOST" \
  --port "$PGPORT" \
  --username "$PGUSER" \
  --dbname "$PGDATABASE" \
  --file "$(dirname "$0")/check-n8n-privileges.sql"
