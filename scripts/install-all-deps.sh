#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH."
  exit 1
fi

python_cmd=""
if command -v python3 >/dev/null 2>&1; then
  python_cmd="python3"
elif command -v python >/dev/null 2>&1; then
  python_cmd="python"
fi

node_services=()
python_services=()

for dir in */; do
  service_dir="${dir%/}"

  if [[ "$service_dir" == "node_modules" || "$service_dir" == ".git" ]]; then
    continue
  fi

  if [[ -f "$service_dir/package.json" ]]; then
    node_services+=("$service_dir")
  fi

  if [[ -f "$service_dir/requirements.txt" ]]; then
    python_services+=("$service_dir")
  fi
done

if [[ ${#node_services[@]} -eq 0 && ${#python_services[@]} -eq 0 ]]; then
  echo "No service dependencies found to install."
  exit 1
fi

for service in "${node_services[@]}"; do
  echo ""
  echo "Installing Node dependencies in: $service"
  pushd "$service" >/dev/null
  if [[ -f package-lock.json ]]; then
    npm ci || npm install
  else
    npm install
  fi
  popd >/dev/null
done

if [[ ${#python_services[@]} -gt 0 ]]; then
  if [[ -z "$python_cmd" ]]; then
    echo ""
    echo "Warning: python3/python not found; skipping Python dependency installation."
  else
    for service in "${python_services[@]}"; do
      echo ""
      echo "Installing Python dependencies in: $service (isolated .venv)"
      pushd "$service" >/dev/null

      if [[ ! -d ".venv" ]]; then
        "$python_cmd" -m venv .venv
      fi

      ./.venv/bin/pip install --upgrade pip
      ./.venv/bin/pip install -r requirements.txt

      popd >/dev/null
    done
  fi
fi

echo ""
echo "Done installing dependencies."
