#!/usr/bin/env sh
set -eu

# Рисует один «кадр» терминального статуса и хвоста лога.
render_terminal_status() {
  agent_label=$(agent_display_name)
  clear
  printf '%s Auto Monitor\n' "$agent_label"
  printf 'PID: %s\n' "$AGENT_PID"
  printf 'Mode: %s / %s\n' "$MODE" "${AGENT_AUTO_ENGINE:-claude}"
  printf 'Log: %s\n' "$LOG_FILE"
  if is_running "$AGENT_PID"; then
    printf 'Status: running\n'
  else
    printf 'Status: finished\n'
  fi
  printf 'Press Ctrl+C to stop and exit.\n'
  printf '----------------------------------------\n'
  tail -n 30 "$LOG_FILE"
}

# Периодически обновляет терминальный UI, пока процесс агента работает.
run_terminal_monitor() {
  tick=0
  while :
  do
    render_terminal_status
    tick=$((tick + 1))
    if [ $((tick % 5)) -eq 0 ]; then
      if is_running "$AGENT_PID"; then
        log_event "THINK" "Monitor heartbeat: ${AGENT_AUTO_ENGINE:-claude} still running (PID=$AGENT_PID)"
      else
        log_event "THINK" "Monitor heartbeat: ${AGENT_AUTO_ENGINE:-claude} stopped (PID=$AGENT_PID)"
      fi
    fi
    if ! is_running "$AGENT_PID"; then
      break
    fi
    sleep 1
  done
}
