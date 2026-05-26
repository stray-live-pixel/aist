#!/usr/bin/env sh
set -eu

# Запускает оркестратор flow в фоне. Его PID становится AGENT_PID
# для HTML/terminal-монитора и общего cleanup.
start_flow() {
  flow_name=$1
  shift
  extra_prompt=${*:-}

  if [ ! -d "$SCRIPT_DIR/flows/$flow_name" ]; then
    echo "Error: flow '$flow_name' not found at flows/$flow_name." >&2
    exit 1
  fi

  START_TS=$(date +%Y-%m-%dT%H:%M:%SZ)
  FLOW_FILE="$SESSION_DIR/flow.json"
  FLOW_WORK_DIR="$SESSION_DIR/flows"
  mkdir -p "$FLOW_WORK_DIR"

  # Стартовый файл состояния — UI сразу понимает, что это flow-сессия.
  printf '{"flow":"%s","status":"starting","stages":[],"current":0}\n' \
    "$flow_name" > "$FLOW_FILE"

  log_event "FLOW" "Starting flow '$flow_name' (engine=${AGENT_AUTO_ENGINE:-claude}, autonomous)"

  AGENT_AUTO_LOG_FILE="$LOG_FILE" \
  AGENT_AUTO_LOG_JSONL_FILE="$LOG_JSONL_FILE" \
  AGENT_AUTO_STATE_FILE="$STATE_FILE" \
  AGENT_AUTO_FLOW_FILE="$FLOW_FILE" \
  AGENT_AUTO_FLOW_WORK_DIR="$FLOW_WORK_DIR" \
  AGENT_AUTO_FLOW_NAME="$flow_name" \
  AGENT_AUTO_EXTRA_PROMPT="$extra_prompt" \
  AGENT_AUTO_ENGINE="${AGENT_AUTO_ENGINE:-claude}" \
  AGENT_AUTO_CLAUDE_MODEL="$AGENT_AUTO_CLAUDE_MODEL" \
  AGENT_AUTO_CODEX_MODEL="${AGENT_AUTO_CODEX_MODEL:-}" \
  AGENT_AUTO_CTX_LIMIT="$AGENT_AUTO_CTX_LIMIT" \
  AGENT_AUTO_DRY_RUN="${DRY_RUN:-0}" \
    python3 -u "$SRC_DIR/run_flow.py" &
  AGENT_PID=$!
  PARSER_PID=""
  FIFO_PATH=""
  log_event "WRITE" "Flow runner PID=$AGENT_PID"
  write_status running null
}
