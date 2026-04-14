#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTS_FILE="$ROOT_DIR/ports.txt"
PID_DIR="$ROOT_DIR/.microservice-pids"
STOP_SCRIPT="$ROOT_DIR/scripts/stop-all-separate-terminals.sh"

if [[ ! -f "$PORTS_FILE" ]]; then
  echo "Error: ports file not found at $PORTS_FILE"
  exit 1
fi

declare -A PORTS

safe_id() {
  local value="$1"
  value="${value,,}"
  value="${value// /-}"
  value="${value//\//-}"
  value="${value//(/-}"
  value="${value//)/-}"
  value="${value//:/-}"
  value="${value//--/-}"
  printf '%s' "$value"
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

load_ports() {
  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    local line
    line="$(trim "$raw_line")"

    [[ -z "$line" ]] && continue
    [[ "$line" == \#* ]] && continue
    [[ "$line" != *"="* ]] && continue

    local key_part="${line%%=*}"
    local value_part="${line#*=}"
    local key value
    key="$(trim "$key_part")"
    value="$(trim "$value_part")"

    if [[ "$value" =~ ^[0-9]+$ ]]; then
      PORTS["$key"]="$value"
    fi
  done < "$PORTS_FILE"
}

require_port() {
  local key="$1"
  if [[ -z "${PORTS[$key]:-}" ]]; then
    echo "Error: missing port mapping for '$key' in ports.txt"
    exit 1
  fi
  printf '%s' "${PORTS[$key]}"
}

TERMINAL_TYPE=""

detect_terminal() {
  if command -v gnome-terminal >/dev/null 2>&1; then
    TERMINAL_TYPE="gnome"
  elif command -v xfce4-terminal >/dev/null 2>&1; then
    TERMINAL_TYPE="xfce4"
  elif command -v konsole >/dev/null 2>&1; then
    TERMINAL_TYPE="konsole"
  elif command -v xterm >/dev/null 2>&1; then
    TERMINAL_TYPE="xterm"
  elif command -v x-terminal-emulator >/dev/null 2>&1; then
    TERMINAL_TYPE="x-terminal-emulator"
  else
    echo "Error: no supported terminal emulator found (gnome-terminal, xfce4-terminal, konsole, xterm, x-terminal-emulator)."
    exit 1
  fi
}

launch_in_terminal() {
  local title="$1"
  local command="$2"

  case "$TERMINAL_TYPE" in
    gnome)
      gnome-terminal --title="$title" -- bash -lc "$command"
      ;;
    xfce4)
      xfce4-terminal --title="$title" --hold -e "bash -lc '$command'"
      ;;
    konsole)
      konsole --new-tab -p tabtitle="$title" -e bash -lc "$command"
      ;;
    xterm)
      xterm -T "$title" -hold -e bash -lc "$command"
      ;;
    x-terminal-emulator)
      x-terminal-emulator -e bash -lc "$command"
      ;;
  esac
}

start_node_service() {
  local title="$1"
  local service_dir="$2"
  local port_key="$3"
  local service_id
  service_id="$(safe_id "$title")"
  local pid_file="$PID_DIR/$service_id.pid"
  local port
  port="$(require_port "$port_key")"

  if [[ ! -d "$ROOT_DIR/$service_dir" ]]; then
    echo "Warning: '$service_dir' not found, skipping $title"
    return
  fi

  local cmd="cd \"$ROOT_DIR/$service_dir\" && PORT=\"$port\" npm run start:dev & svc_pid=\$!; echo \"\$svc_pid\" > \"$pid_file\"; wait \"\$svc_pid\"; rm -f \"$pid_file\"; echo; echo \"$title exited. Press Enter to close...\"; read -r _"
  launch_in_terminal "$title" "$cmd"
}

start_python_service() {
  local title="$1"
  local service_dir="$2"
  local entrypoint="$3"
  local port_key="$4"
  local service_id
  service_id="$(safe_id "$title")"
  local pid_file="$PID_DIR/$service_id.pid"
  local port
  port="$(require_port "$port_key")"

  if [[ ! -d "$ROOT_DIR/$service_dir" ]]; then
    echo "Warning: '$service_dir' not found, skipping $title"
    return
  fi

  if [[ ! -f "$ROOT_DIR/$service_dir/$entrypoint" ]]; then
    echo "Warning: '$service_dir/$entrypoint' not found, skipping $title"
    return
  fi

  local python_cmd="python3"
  if [[ -x "$ROOT_DIR/$service_dir/.venv/bin/python" ]]; then
    python_cmd="$ROOT_DIR/$service_dir/.venv/bin/python"
  elif command -v python3 >/dev/null 2>&1; then
    python_cmd="$(command -v python3)"
  elif command -v python >/dev/null 2>&1; then
    python_cmd="$(command -v python)"
  else
    echo "Error: Python not found for $title"
    exit 1
  fi

  local cmd="cd \"$ROOT_DIR/$service_dir\" && PORT=\"$port\" \"$python_cmd\" \"$entrypoint\" & svc_pid=\$!; echo \"\$svc_pid\" > \"$pid_file\"; wait \"\$svc_pid\"; rm -f \"$pid_file\"; echo; echo \"$title exited. Press Enter to close...\"; read -r _"
  launch_in_terminal "$title" "$cmd"
}

load_ports
detect_terminal
mkdir -p "$PID_DIR"
rm -f "$PID_DIR"/*.pid

echo "Using terminal emulator: $TERMINAL_TYPE"

start_node_service "API Gateway (4000)" "api-gateway" "APP"
start_node_service "Auth (4002)" "auth-ms" "AUTH"
start_node_service "Lab (4003)" "lab" "LAB"
start_node_service "Fitness (4005)" "fitness" "FITNESS"
start_node_service "Appointments (4006)" "appointments" "APPOINTMENT"
start_node_service "Scheduler (4009)" "scheduler" "Scheduler"
start_node_service "Mailer (4010)" "mailer" "Mailer"
start_node_service "Admin (4011)" "admin" "Admin"

start_python_service "Embeddings (4008)" "embeddings" "main.py" "Embeddings"
start_python_service "Recommendations (4012)" "recommendations" "main.py" "Recommendations"
start_python_service "MCP (4007)" "mcp" "mcp_server.py" "MCP"

stop_all_services() {
  if [[ -x "$STOP_SCRIPT" ]]; then
    bash "$STOP_SCRIPT"
  else
    echo "Warning: stop script not found at $STOP_SCRIPT"
  fi
}

handle_interrupt() {
  echo ""
  echo "Ctrl+C received. Stopping all services..."
  stop_all_services
  exit 0
}

trap handle_interrupt INT TERM

echo "Launched all configured microservices in separate terminal windows."
echo "Type 'stop' and press Enter in this terminal to stop all services."

while true; do
  read -r -p "command> " user_command
  if [[ "$user_command" == "stop" ]]; then
    echo "Stopping all services..."
    stop_all_services
    break
  fi

  if [[ -n "$user_command" ]]; then
    echo "Unknown command: $user_command"
    echo "Use: stop"
  fi
done

echo "All services stopped."
