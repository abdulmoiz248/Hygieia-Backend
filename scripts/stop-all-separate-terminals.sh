#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.microservice-pids"

if [[ ! -d "$PID_DIR" ]]; then
  echo "No PID directory found. Nothing to stop."
  exit 0
fi

shopt -s nullglob
pid_files=("$PID_DIR"/*.pid)

if [[ ${#pid_files[@]} -eq 0 ]]; then
  echo "No running microservice PIDs found."
  exit 0
fi

stopped=0

for pid_file in "${pid_files[@]}"; do
  service_name="$(basename "$pid_file" .pid)"
  pid="$(cat "$pid_file" 2>/dev/null || true)"

  if [[ -z "$pid" || ! "$pid" =~ ^[0-9]+$ ]]; then
    rm -f "$pid_file"
    continue
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "Stopping $service_name (PID $pid)..."
    kill "$pid" >/dev/null 2>&1 || true

    for _ in {1..20}; do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        break
      fi
      sleep 0.2
    done

    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "Force killing $service_name (PID $pid)..."
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi

    ((stopped+=1))
  fi

  rm -f "$pid_file"
done

echo "Stopped $stopped microservice process(es)."
