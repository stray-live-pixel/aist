#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-optimization_feature}"
MAIN_BRANCH="${MAIN_BRANCH:-main}"
ISSUES_DIR="${ISSUES_DIR:-product/optimization/issues}"
PROMPT_TEMPLATE="${PROMPT_TEMPLATE:-scripts/optimization-task-prompt.md}"
AGENT_CMD="${AGENT_CMD:-codex exec --dangerously-bypass-approvals-and-sandbox}"
REMOTE="${REMOTE:-origin}"

log() {
  printf '[optimize:next] %s\n' "$*"
}

fail() {
  printf '[optimize:next] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is missing: $1"
}

ensure_clean_workspace() {
  local status
  status="$(git status --porcelain)"
  [[ -z "$status" ]] || fail "Workspace must be clean before autonomous run. Current changes:\n$status"
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

branch_name_for_issue() {
  local issue_path issue_base issue_slug
  issue_path="$1"
  issue_base="$(basename "$issue_path" .md)"
  issue_slug="$(printf '%s' "$issue_base" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9._/-' '-')"
  printf 'optimization/%s' "$issue_slug"
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
  # например `AGENT_CMD='claude -p' npm run optimize:next`.
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

push_and_create_pr() {
  local branch issue_path title body pr_url
  branch="$1"
  issue_path="$2"
  title="$(basename "$issue_path" .md | sed -E 's/^[0-9]+-//; s/-/ /g; s/.*/Optimization: &/')"
  body="$(cat <<BODY
## Summary
Autonomous implementation for \`$issue_path\`.

## Verification
Supervisor required and/or pre-commit checks:
- npm run typecheck
- npm run test

Base branch: \`$BASE_BRANCH\`.
BODY
)"

  git push -u "$REMOTE" "$branch"
  pr_url="$(gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$title" --body "$body")"
  log "Created PR: $pr_url"
}

main() {
  require_command git
  require_command gh
  require_command bash
  gh auth status >/dev/null || fail "GitHub CLI is not authenticated. Run: gh auth login"
  [[ -f "$PROMPT_TEMPLATE" ]] || fail "Prompt template not found: $PROMPT_TEMPLATE"

  local agent_binary
  agent_binary="${AGENT_CMD%% *}"
  require_command "$agent_binary"

  ensure_clean_workspace
  ensure_base_branch
  ensure_clean_workspace

  local issue_path branch before_head
  issue_path="$(find_next_issue)"
  [[ -n "$issue_path" ]] || fail "No pending optimization issues found in $ISSUES_DIR"

  branch="$(branch_name_for_issue "$issue_path")"
  if git show-ref --verify --quiet "refs/heads/$branch" || git ls-remote --exit-code --heads "$REMOTE" "$branch" >/dev/null 2>&1; then
    fail "Task branch already exists: $branch"
  fi

  git checkout -b "$branch"
  before_head="$(git rev-parse HEAD)"
  log "Selected issue: $issue_path"
  log "Task branch: $branch"

  run_agent "$issue_path"

  assert_new_commit "$before_head"
  assert_done_issue_exists "$issue_path"
  ensure_clean_workspace

  log "Running supervisor verification."
  npm run typecheck
  npm run test

  push_and_create_pr "$branch" "$issue_path"
  log "Done. Merge the PR into $BASE_BRANCH, then run this command again for the next issue."
}

main "$@"
