#!/usr/bin/env sh

agent_binary_codex() {
  printf 'codex'
}

agent_display_name_codex() {
  printf 'Codex'
}

agent_model_codex() {
  printf '%s' "${AGENT_AUTO_CODEX_MODEL:-}"
}

run_agent_direct_codex() {
  prompt=${*:-}
  if [ -n "${AGENT_AUTO_CODEX_MODEL:-}" ]; then
    exec codex \
      --dangerously-bypass-approvals-and-sandbox \
      -C "$AGENT_AUTO_ADD_DIR" \
      --add-dir "$AGENT_AUTO_ADD_DIR" \
      --model "$AGENT_AUTO_CODEX_MODEL" \
      "$prompt"
  fi
  exec codex \
    --dangerously-bypass-approvals-and-sandbox \
    -C "$AGENT_AUTO_ADD_DIR" \
    --add-dir "$AGENT_AUTO_ADD_DIR" \
    "$prompt"
}

start_agent_codex() {
  START_TS=$(date +%Y-%m-%dT%H:%M:%SZ)
  prompt=${*:-}

  rm -f "$FIFO_PATH"
  mkfifo "$FIFO_PATH"

  CODEX_STDERR_FILE="$SESSION_DIR/codex.stderr.log"
  : > "$CODEX_STDERR_FILE"

  model=${AGENT_AUTO_CODEX_MODEL:-}
  model_note=${model:-codex-default}
  log_event "WRITE" "Starting Codex (mode=$MODE, json, model=$model_note)"

  AGENT_AUTO_LOG_FILE="$LOG_FILE" \
  AGENT_AUTO_LOG_JSONL_FILE="$LOG_JSONL_FILE" \
  AGENT_AUTO_STATE_FILE="$STATE_FILE" \
  AGENT_AUTO_STAGE_INDEX="0" \
  AGENT_AUTO_STAGE_MODEL="$model_note" \
  AGENT_AUTO_CTX_LIMIT="$AGENT_AUTO_CTX_LIMIT" \
  AGENT_AUTO_ENGINE="codex" \
    python3 -u "$SRC_DIR/parse_agent_stream.py" < "$FIFO_PATH" &
  PARSER_PID=$!

  if [ -n "$model" ]; then
    codex exec \
          --json \
          --dangerously-bypass-approvals-and-sandbox \
          --skip-git-repo-check \
          -C "${AGENT_AUTO_ADD_DIR:-$SCRIPT_DIR}" \
          --add-dir "${AGENT_AUTO_ADD_DIR:-$SCRIPT_DIR}" \
          --model "$model" \
          "$prompt" > "$FIFO_PATH" 2>> "$CODEX_STDERR_FILE" < /dev/null &
  else
    codex exec \
          --json \
          --dangerously-bypass-approvals-and-sandbox \
          --skip-git-repo-check \
          -C "${AGENT_AUTO_ADD_DIR:-$SCRIPT_DIR}" \
          --add-dir "${AGENT_AUTO_ADD_DIR:-$SCRIPT_DIR}" \
          "$prompt" > "$FIFO_PATH" 2>> "$CODEX_STDERR_FILE" < /dev/null &
  fi
  AGENT_PID=$!

  log_event "WRITE" "Started Codex PID=$AGENT_PID, parser PID=$PARSER_PID"
  write_status running null
}

