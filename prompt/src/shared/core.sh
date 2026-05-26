#!/usr/bin/env sh
set -eu

: "${AGENT_AUTO_CTX_LIMIT:=${CLAUDE_AUTO_CTX_LIMIT:-200000}}"
: "${AGENT_AUTO_CLAUDE_MODEL:=${CLAUDE_AUTO_MODEL:-claude-opus-4-7}}"
: "${AGENT_AUTO_CODEX_MODEL:=${CLAUDE_AUTO_CODEX_MODEL:-}}"

require_binary() {
  label=$1
  if ! command -v "$label" >/dev/null 2>&1; then
    echo "Error: $label is required. Install or ensure it is in PATH." >&2
    return 1
  fi
}

agent_binary() {
  case "${AGENT_AUTO_ENGINE:-claude}" in
    claude) agent_binary_claude ;;
    codex) agent_binary_codex ;;
  esac
}

agent_display_name() {
  case "${AGENT_AUTO_ENGINE:-claude}" in
    claude) agent_display_name_claude ;;
    codex) agent_display_name_codex ;;
  esac
}

run_agent_direct() {
  case "${AGENT_AUTO_ENGINE:-claude}" in
    claude) run_agent_direct_claude "$@" ;;
    codex) run_agent_direct_codex "$@" ;;
  esac
}

start_agent() {
  case "${AGENT_AUTO_ENGINE:-claude}" in
    claude) start_agent_claude "$@" ;;
    codex) start_agent_codex "$@" ;;
  esac
}

read_ctx_tokens() {
  if [ -z "${STATE_FILE:-}" ] || [ ! -f "$STATE_FILE" ]; then
    printf '0'
    return
  fi
  python3 - "$STATE_FILE" <<'PY' 2>/dev/null || printf '0'
import json, sys
try:
    with open(sys.argv[1]) as f:
        data = json.load(f)
    print(int(data.get("contextTokens") or 0))
except Exception:
    print(0)
PY
}

log_event() {
  if [ "$#" -lt 2 ]; then
    return 0
  fi

  action=$1
  shift
  text=$*
  full_text=$text

  if [ -z "${action}" ]; then
    action="INFO"
  fi

  if [ "${#text}" -gt 100 ]; then
    text="$(printf '%s' "$text" | cut -c1-97)..."
  fi

  ts=$(date +%d-%m-%Y\ %H:%M:%S)
  ctx_tokens=$(read_ctx_tokens)
  ctx_k=$(( ctx_tokens / 1000 ))
  limit_k=$(( AGENT_AUTO_CTX_LIMIT / 1000 ))
  ctx_pct=0
  if [ "$ctx_tokens" -gt 0 ] && [ "$AGENT_AUTO_CTX_LIMIT" -gt 0 ]; then
    ctx_pct=$(( ctx_tokens * 100 / AGENT_AUTO_CTX_LIMIT ))
  fi
  if [ "$ctx_pct" -gt 100 ]; then
    ctx_pct=100
  fi

  {
    printf '[%s] [%s] %s\n' "$ts" "$action" "$text"
    printf 'CTX %sk/%sk - %d%%\n' "$ctx_k" "$limit_k" "$ctx_pct"
    printf '%s\n' "--------------------------------------------------------------"
  } >> "${LOG_FILE:-/dev/null}"

  if [ -n "${LOG_JSONL_FILE:-}" ]; then
    AGENT_AUTO_LOG_JSONL_FILE="$LOG_JSONL_FILE" \
    AGENT_AUTO_STATE_FILE="${STATE_FILE:-}" \
    AGENT_AUTO_CTX_LIMIT="$AGENT_AUTO_CTX_LIMIT" \
    AGENT_AUTO_STAGE_INDEX="${LOG_STAGE_INDEX:-0}" \
      python3 "$SRC_DIR/shared/logentry.py" "$action" "$full_text" 2>/dev/null || true
  fi
}

usage() {
  cat <<'EOF'
Usage:
  ./agent-auto.sh [--engine claude|codex] [--ui|--html]
                   [--flow NAME [--dry-run]] [--run NAME]
                   [--cwd DIR] [--log-dir DIR] [--log-file FILE]
                   [--port PORT] [--] [extra prompt or agent args]

Runs a supported coding agent from this project in autonomous mode.
The selected agent is launched without confirmation prompts. Use only in
directories you trust.

Options:
  --engine NAME   Agent backend: claude (default) or codex.
  --ui            Start a simple terminal UI for monitoring while the agent runs.
  --html          Start a web dashboard at
                  http://127.0.0.1:PORT/ui?session=ID.
  --flow NAME     Run a multi-stage flow defined in flows/NAME/.
  --run NAME      Run a batch from runs/NAME/.index.md.
  --cwd DIR       Working directory for the agent.
  --dry-run       For --flow / --run: do not invoke the agent; emit synthetic events.
  --log-dir DIR   Directory for session logs (default: .agent-auto-logs).
  --log-file FILE Explicit path for the log file.
  --port PORT     Port for the HTML dashboard (default: 8765).
  -h, --help      Show this help.

Examples:
  ./agent-auto.sh "Refactor this project and run tests"
  ./agent-auto.sh --engine codex --html "Summarize and fix issues"
  ./agent-auto.sh --html --flow code-review
  ./agent-auto.sh --run my-batch --engine codex --html
EOF
}

write_status() {
  status=$1
  code=$2

  if [ -z "${SESSION_ID:-}" ] || [ -z "${LOG_FILE:-}" ] || \
     [ -z "${STATUS_FILE:-}" ] || [ -z "${START_TS:-}" ]; then
    return 0
  fi

  pid_value="${AGENT_PID:-null}"
  case "$pid_value" in
    ''|*[!0-9]*) pid_value="null" ;;
  esac

  if [ "$status" = "running" ]; then
    finished_field=""
  else
    finished_ts=$(date +%Y-%m-%dT%H:%M:%SZ)
    finished_field="\"finishedAt\": \"$finished_ts\","
  fi

  cat <<EOF > "$STATUS_FILE"
{
  "session": "$SESSION_ID",
  "status": "$status",
  "mode": "$MODE",
  "pid": $pid_value,
  "logFile": "$SESSION_ID/log.txt",
  "exitCode": $code,
  "startedAt": "$START_TS",
  $finished_field
  "ctxLimit": $AGENT_AUTO_CTX_LIMIT,
  "engine": "${AGENT_AUTO_ENGINE:-claude}"
}
EOF
}

resolve_paths() {
  if [ -z "${LOG_DIR:-}" ]; then
    LOG_DIR="$SCRIPT_DIR/.agent-auto-logs"
  fi

  mkdir -p "$LOG_DIR"

  if [ -z "${LOG_FILE:-}" ]; then
    SESSION_ID=$(date +%Y%m%d_%H%M%S)
  else
    SESSION_ID=$(basename "$LOG_FILE" .log | sed 's/[^A-Za-z0-9._-]//g')
    if [ -z "$SESSION_ID" ]; then
      SESSION_ID=$(date +%Y%m%d_%H%M%S)
    fi
  fi

  SESSION_DIR="$LOG_DIR/$SESSION_ID"
  mkdir -p "$SESSION_DIR"

  LOG_FILE="$SESSION_DIR/log.txt"
  LOG_JSONL_FILE="$SESSION_DIR/log.jsonl"
  STATUS_FILE="$SESSION_DIR/status.json"
  STATE_FILE="$SESSION_DIR/ctx.json"
  COMMAND_FILE="$SESSION_DIR/command.txt"
  FIFO_PATH="$SESSION_DIR/stream.fifo"

  : > "$LOG_FILE"
  : > "$LOG_JSONL_FILE"
  : > "$STATUS_FILE"
  printf '{"contextTokens":0,"contextK":0,"contextLimitK":%d,"contextPct":0}\n' \
    $(( AGENT_AUTO_CTX_LIMIT / 1000 )) > "$STATE_FILE"

  if [ -n "${AGENT_AUTO_RAW_CMD:-}" ]; then
    printf '%s\n' "$AGENT_AUTO_RAW_CMD" > "$COMMAND_FILE"
  fi

  log_event "SYS" "Session initialized: session=$SESSION_ID dir=$SESSION_DIR"
}

write_snapshot() {
  if [ -z "${SESSION_DIR:-}" ] || [ ! -d "$SESSION_DIR" ]; then
    return 0
  fi
  python3 "$SRC_DIR/shared/snapshot.py" "$SESSION_DIR" "$SCRIPT_DIR" \
    >/dev/null 2>&1 || true
}

ensure_print_flag() {
  for a in "$@"; do
    case "$a" in
      -p|--print) return 1 ;;
    esac
  done
  return 0
}

finalize_pipeline() {
  if [ -n "${PARSER_PID:-}" ]; then
    wait "$PARSER_PID" 2>/dev/null || true
  fi
  if [ -n "${FIFO_PATH:-}" ] && [ -p "$FIFO_PATH" ]; then
    rm -f "$FIFO_PATH"
  fi
}

is_running() {
  if kill -0 "$1" 2>/dev/null; then
    return 0
  fi
  return 1
}
