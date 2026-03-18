#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <source-env-file>"
  echo "Example: $0 .env.example"
  exit 1
fi

SOURCE_ENV="$1"

if [[ ! -f "$SOURCE_ENV" ]]; then
  echo "Error: source env file not found: $SOURCE_ENV"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ENV_ABS="$(cd "$(dirname "$SOURCE_ENV")" && pwd)/$(basename "$SOURCE_ENV")"

cd "$ROOT_DIR"

updated_count=0

for dir in */; do
  service_dir="${dir%/}"

  if [[ "$service_dir" == "node_modules" || "$service_dir" == ".git" ]]; then
    continue
  fi

  if [[ -f "$service_dir/package.json" || -f "$service_dir/requirements.txt" ]]; then
    cp "$SOURCE_ENV_ABS" "$service_dir/.env"
    echo "Created: $service_dir/.env"
    ((updated_count+=1))
  fi
done

if [[ $updated_count -eq 0 ]]; then
  echo "No microservice directories found."
  exit 1
fi

echo "Done. Created/updated .env in $updated_count microservice(s)."
