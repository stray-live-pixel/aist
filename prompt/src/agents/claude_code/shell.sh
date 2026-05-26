#!/usr/bin/env sh

agent_binary_claude() {
  printf 'claude'
}

agent_display_name_claude() {
  printf 'Claude'
}

agent_model_claude() {
  printf '%s' "$AGENT_AUTO_CLAUDE_MODEL"
}

run_agent_direct_claude() {
  exec claude \
    --permission-mode bypassPermissions \
    --allow-dangerously-skip-permissions \
    --dangerously-skip-permissions \
    --setting-sources user,project,local \
    --allowedTools "Bash Read Write Edit MultiEdit Glob Grep TodoWrite NotebookEdit WebFetch WebSearch" \
    --add-dir "$AGENT_AUTO_ADD_DIR" \
    --model "$AGENT_AUTO_CLAUDE_MODEL" \
    --effort high \
    --include-partial-messages \
    "$@"
}

start_agent_claude() {
  START_TS=$(date +%Y-%m-%dT%H:%M:%SZ)

  if ensure_print_flag "$@"; then
    set -- -p "$@"
  fi

  rm -f "$FIFO_PATH"
  mkfifo "$FIFO_PATH"

  log_event "WRITE" "Starting Claude (mode=$MODE, stream-json)"

  AGENT_AUTO_LOG_FILE="$LOG_FILE" \
  AGENT_AUTO_LOG_JSONL_FILE="$LOG_JSONL_FILE" \
  AGENT_AUTO_STATE_FILE="$STATE_FILE" \
  AGENT_AUTO_STAGE_INDEX="0" \
  AGENT_AUTO_CTX_LIMIT="$AGENT_AUTO_CTX_LIMIT" \
  AGENT_AUTO_ENGINE="claude" \
    python3 -u "$SRC_DIR/parse_agent_stream.py" < "$FIFO_PATH" &
  PARSER_PID=$!

  claude --permission-mode bypassPermissions \
         --allow-dangerously-skip-permissions \
         --dangerously-skip-permissions \
         --setting-sources user,project,local \
         --allowedTools "Bash Read Write Edit MultiEdit Glob Grep TodoWrite NotebookEdit WebFetch WebSearch" \
         --add-dir "${AGENT_AUTO_ADD_DIR:-$SCRIPT_DIR}" \
         --model "$AGENT_AUTO_CLAUDE_MODEL" \
         --effort high \
         --include-partial-messages \
         --output-format stream-json \
         --verbose \
         "$@" > "$FIFO_PATH" 2>&1 &
  AGENT_PID=$!

  log_event "WRITE" "Started Claude PID=$AGENT_PID, parser PID=$PARSER_PID"
  write_status running null
}

