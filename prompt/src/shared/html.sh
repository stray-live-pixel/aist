#!/usr/bin/env sh
set -eu

# Запускает HTTP-сервер с поддержкой /shutdown.
run_http_server() {
  require_binary python3
  AGENT_AUTO_HOST="$HOST" \
  AGENT_AUTO_PORT="$PORT" \
  AGENT_AUTO_ROOT="$SCRIPT_DIR" \
    python3 -u "$SRC_DIR/server.py" \
      >/tmp/agent-auto-http-${PORT}.log 2>&1 &
  SERVER_PID=$!
}

# Аккуратно останавливает HTTP-сервер.
shutdown_http_server() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

# Открывает URL в браузере: macOS -> open, Linux -> xdg-open.
open_in_browser() {
  ui_url=$1
  if command -v open >/dev/null 2>&1; then
    open "$ui_url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$ui_url" >/dev/null 2>&1 || true
  else
    echo "Browser open command not found. Open URL manually: $ui_url"
  fi
}

# Управляет web-UI: старт сервера, печатает URL, ждет завершения агента,
# генерирует снапшот и закрывает сервер после завершения сессии.
run_html_monitor() {
  if [ -z "${SESSION_ID:-}" ]; then
    echo "Error: internal session id generation failed." >&2
    exit 1
  fi

  agent_label=$(agent_display_name)

  ui_url="http://$HOST:$PORT/ui?session=$SESSION_ID"
  log_event "WRITE" "Opening web UI at $ui_url"
  echo "$agent_label UI: $ui_url"
  echo "Log: $LOG_FILE"
  echo "Press Ctrl+C to stop $agent_label and the HTTP server."

  run_http_server
  open_in_browser "$ui_url"

  cleanup() {
    log_event "WRITE" "Termination signal received. Shutting down."
    if [ -n "${AGENT_PID:-}" ]; then
      kill "$AGENT_PID" 2>/dev/null || true
    fi
    finalize_pipeline
    shutdown_http_server
    write_status stopped null
    write_snapshot
    exit 130
  }

  trap cleanup INT TERM

  # Ждем завершения агента.
  wait "$AGENT_PID" 2>/dev/null || true
  AGENT_EXIT=$?
  finalize_pipeline
  log_event "WRITE" "$agent_label exited with code $AGENT_EXIT"
  write_status finished "$AGENT_EXIT"
  write_snapshot
  echo "$agent_label finished (exit=$AGENT_EXIT)."
  echo "Snapshot generated: $SESSION_DIR/view.html"
  open_in_browser "$SESSION_DIR/view.html"
  shutdown_http_server
  log_event "WRITE" "HTTP server stopped automatically."
  exit "$AGENT_EXIT"
}
