#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-optimization_feature}"
MAIN_BRANCH="${MAIN_BRANCH:-main}"
ISSUES_DIR="${ISSUES_DIR:-product/optimization/issues}"
PROMPT_TEMPLATE="${PROMPT_TEMPLATE:-scripts/optimization-task-prompt.md}"
AGENT_CMD="${AGENT_CMD:-codex exec --dangerously-bypass-approvals-and-sandbox}"
REMOTE="${REMOTE:-origin}"
PUSH_AFTER_EACH="${PUSH_AFTER_EACH:-1}"
MAX_TASKS="${MAX_TASKS:-0}"

log() {
  printf '[optimize:cycle] %s\n' "$*"
}

fail() {
  printf '[optimize:cycle] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is missing: $1"
}

ensure_clean_workspace() {
  local status
  status="$(git status --porcelain)"
  [[ -z "$status" ]] || fail "Workspace must be clean before continuing autonomous cycle. Current changes:\n$status"
}

ensure_base_branch() {
  git fetch "$REMOTE" --prune

  if git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
    git checkout "$BASE_BRANCH"
    git pull --ff-only "$REMOTE" "$BASE_BRANCH"
    return
  fi

  if git ls-remote --exit-code --heads "$REMOTE" "$BASE_BRANCH" >/dev/null 2>&1; then
    git checkout -b "$BASE_BRANCH" "$REMOTE/$BASE_BRANCH"
    git pull --ff-only "$REMOTE" "$BASE_BRANCH"
    return
  fi

  log "Base branch $BASE_BRANCH does not exist; creating it from $MAIN_BRANCH."
  git checkout "$MAIN_BRANCH"
  git pull --ff-only "$REMOTE" "$MAIN_BRANCH"
  git checkout -b "$BASE_BRANCH"
  git push -u "$REMOTE" "$BASE_BRANCH"
}

find_next_issue() {
  find "$ISSUES_DIR" -maxdepth 1 -type f -name '[0-9][0-9][0-9]-*.md' | sort | head -n 1
}

render_prompt() {
  local issue_path issue_content template
  issue_path="$1"
  issue_content="$(cat "$issue_path")"
  template="$(cat "$PROMPT_TEMPLATE")"
  template="${template//'{{ISSUE_PATH}}'/$issue_path}"
  template="${template//'{{ISSUE_CONTENT}}'/$issue_content}"
  printf '%s\n' "$template"
}

run_agent() {
  local issue_path prompt_file
  issue_path="$1"
  prompt_file="$(mktemp)"
  render_prompt "$issue_path" >"$prompt_file"
  log "Running agent command: $AGENT_CMD"
  # AGENT_CMD намеренно строка: пользователю удобно подменить engine с аргументами,
  # например `AGENT_CMD='claude -p' npm run optimize:cycle`.
  bash -lc "$AGENT_CMD < \"$prompt_file\""
  rm -f "$prompt_file"
}

assert_done_issue_exists() {
  local issue_path done_path
  issue_path="$1"
  done_path="$(dirname "$issue_path")/DONE-$(basename "$issue_path")"
  [[ -f "$done_path" ]] || fail "Agent did not mark issue as DONE: expected $done_path"
}

assert_new_commit() {
  local before_head after_head
  before_head="$1"
  after_head="$(git rev-parse HEAD)"
  [[ "$before_head" != "$after_head" ]] || fail "Agent finished without creating a commit."
}

verify_after_task() {
  log "Running supervisor verification."
  npm run typecheck
  npm run test
}

push_base_branch() {
  if [[ "$PUSH_AFTER_EACH" == "1" ]]; then
    git push -u "$REMOTE" "$BASE_BRANCH"
  fi
}

run_one_issue() {
  local issue_path before_head
  issue_path="$1"
  before_head="$(git rev-parse HEAD)"

  log "Selected issue: $issue_path"
  run_agent "$issue_path"

  assert_new_commit "$before_head"
  assert_done_issue_exists "$issue_path"
  ensure_clean_workspace
  verify_after_task
  push_base_branch
  log "Issue completed: $issue_path"
}

main() {
  require_command git
  require_command bash
  [[ -f "$PROMPT_TEMPLATE" ]] || fail "Prompt template not found: $PROMPT_TEMPLATE"

  local agent_binary
  agent_binary="${AGENT_CMD%% *}"
  require_command "$agent_binary"

  ensure_clean_workspace
  ensure_base_branch
  ensure_clean_workspace

  local completed issue_path
  completed=0
  while true; do
    issue_path="$(find_next_issue)"
    if [[ -z "$issue_path" ]]; then
      log "No pending optimization issues found in $ISSUES_DIR. Cycle finished."
      break
    fi

    if [[ "$MAX_TASKS" != "0" && "$completed" -ge "$MAX_TASKS" ]]; then
      log "MAX_TASKS=$MAX_TASKS reached. Stop before next issue: $issue_path"
      break
    fi

    run_one_issue "$issue_path"
    completed=$((completed + 1))
  done

  log "Completed tasks in this run: $completed"
  log "Current branch: $(git branch --show-current)"
  log "Tip: $(git rev-parse --short HEAD)"
}

main "$@"
