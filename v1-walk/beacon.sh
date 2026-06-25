#!/usr/bin/env bash
#
# beacon.sh — run Beacon v1 (walk) locally. The control plane (a server) and Postgres (the DB) are
# managed separately so restarting the server never bounces the database.
#
#   ./beacon.sh start      start the control plane (BEACON_DB=1 also brings Postgres up)
#   ./beacon.sh stop       stop the control plane (and Postgres, if BEACON_DB=1)
#   ./beacon.sh restart    restart the control plane onto the current DB — does NOT bounce Postgres
#   ./beacon.sh status     running? show live connector health + backend
#   ./beacon.sh demo       run the connectors + memory demos (real calls)
#   ./beacon.sh test       run the test suite
#   ./beacon.sh logs       tail the control-plane log
#
# Env: PORT=7878 · BEACON_DB=1 (manage Postgres+pgvector via Docker alongside the server)
#
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-7878}"
PID_FILE=".beacon-control-plane.pid"
LOG_FILE="control-plane.log"
URL="http://localhost:${PORT}"

have()        { command -v "$1" >/dev/null 2>&1; }
ensure_deps() { [ -d node_modules ] || { echo "→ installing dependencies (first run)…"; npm install; }; }
is_running()  { [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; }

free_port() {
  # the node child of `npm run` can outlive the npm pid — free the port directly too
  have lsof || return 0
  local pids; pids="$(lsof -ti:"$PORT" 2>/dev/null || true)"
  [ -n "$pids" ] && kill $pids 2>/dev/null || true
}

# --- Postgres (only when BEACON_DB=1) ---------------------------------------
db_up() {
  [ "${BEACON_DB:-0}" = "1" ] || return 0
  if ! have docker; then echo "! BEACON_DB=1 but Docker not found — using the in-memory store"; return 0; fi
  if ! docker info >/dev/null 2>&1; then
    echo "! Docker is installed but the daemon isn't running."
    echo "  Start it (Docker Desktop, or 'colima start') and re-run — using in-memory for now."
    return 0
  fi
  echo "→ Postgres + pgvector: docker compose up (waiting for healthy)…"
  docker compose up -d --wait
  export DATABASE_URL="${DATABASE_URL:-postgres://beacon:beacon@localhost:5432/beacon}"
}
db_down() {
  [ "${BEACON_DB:-0}" = "1" ] && have docker && docker info >/dev/null 2>&1 \
    && { echo "→ stopping Postgres…"; docker compose down; } || true
}

# --- control plane (the server) ---------------------------------------------
server_start() {
  ensure_deps
  echo "→ starting control plane on $URL …"
  PORT="$PORT" DATABASE_URL="${DATABASE_URL:-}" nohup npm run control-plane >"$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  for _ in $(seq 1 30); do
    if curl -s --max-time 1 -o /dev/null "$URL/" 2>/dev/null; then
      echo "✓ up (pid $(cat "$PID_FILE")) → open $URL"
      [ -n "${DATABASE_URL:-}" ] && echo "  memory: postgres+pgvector" || echo "  memory: in-memory  (use ./beacon up for Postgres)"
      return 0
    fi
    sleep 0.3
  done
  echo "✗ did not become healthy — last log lines:"; tail -n 20 "$LOG_FILE"; return 1
}
server_stop() {
  if is_running; then echo "→ stopping control plane (pid $(cat "$PID_FILE"))…"; kill "$(cat "$PID_FILE")" 2>/dev/null || true; fi
  free_port
  rm -f "$PID_FILE"
}

status() {
  if is_running; then
    echo "✓ running (pid $(cat "$PID_FILE")) → $URL"
    curl -s --max-time 2 "$URL/api/connectors" 2>/dev/null | head -c 400 || true; echo
  else
    echo "• not running"
  fi
}
demo() { ensure_deps; echo "############ connectors ############"; npm run connectors; echo; echo "############ memory ############"; npm run memory; }

case "${1:-}" in
  start)   db_up; if is_running; then echo "✓ already running (pid $(cat "$PID_FILE")) → $URL"; else server_start; fi ;;
  stop)    server_stop; db_down; echo "✓ stopped" ;;
  restart) server_stop; db_up; server_start ;;   # server bounces onto current DB; Postgres is untouched
  status)  status ;;
  demo)    demo ;;
  scenario) ensure_deps; npm run scenario ;;
  trust)   ensure_deps; npm run trust ;;
  setup)   ensure_deps; npm run setup ;;
  test)    ensure_deps; npm test ;;
  logs)    tail -f "$LOG_FILE" ;;
  *) echo "usage: ./beacon.sh {start|stop|restart|status|setup|demo|scenario|test|logs}";
     echo "  env: PORT=$PORT  BEACON_DB=1 (Postgres via Docker)"; exit 1 ;;
esac
