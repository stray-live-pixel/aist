/**
 * Что это: собирает bash-финализацию git внутри автономного контейнера.
 * Зачем нужно: commit, push и PR должны создаваться там же, где агент изменял файлы.
 * Какую продуктовую проблему решает: локальный daemon получает итоговые метаданные, не имея checkout с изменениями на host.
 */
export function buildContainerFinalizeScript({
  branchName,
  prompt,
  fallbackAnswer,
  sessionId
}: {
  branchName: string;
  prompt: string;
  fallbackAnswer?: string;
  sessionId: string;
}): string {
  return [
    'set -euo pipefail',
    'cd /workspace',
    'git config user.email "aist-agent@example.local"',
    'git config user.name "AIST Isolated Agent"',
    'changed=false',
    'if [ -n "$(git status --porcelain)" ]; then changed=true; fi',
    'if [ "$changed" = false ]; then',
    '  mkdir -p docs/aist-isolated-runs',
    `  cat > ${quote(`docs/aist-isolated-runs/${sanitizeFileName(sessionId)}.md`)} <<'AIST_FALLBACK'`,
    '# AIST isolated run result',
    '',
    `Session: ${sessionId}`,
    `Created at: ${new Date().toISOString()}`,
    '',
    '## User task',
    '',
    prompt.trim() || '(empty prompt)',
    '',
    '## Agent answer',
    '',
    fallbackAnswer?.trim() || 'The isolated agent completed without a final text answer.',
    'AIST_FALLBACK',
    'fi',
    'if [ -n "$(git status --porcelain)" ]; then changed=true; else changed=false; fi',
    'commitSha=""',
    'if [ "$changed" = true ]; then',
    '  git add -A',
    '  git diff --cached --stat --summary > /tmp/aist-diff-summary.txt',
    `  git commit -m ${quote(createCommitMessage({ prompt, sessionId }))}`,
    '  commitSha="$(git rev-parse HEAD)"',
    `  git push -u origin ${quote(branchName)}`,
    'fi',
    'prUrl=""',
    'prError=""',
    'if command -v gh >/dev/null 2>&1; then',
    `  prUrl="$(gh pr view ${quote(branchName)} --json url --jq .url 2>/dev/null || true)"`,
    '  if [ -z "$prUrl" ]; then',
    `    prUrl="$(gh pr create --fill --head ${quote(branchName)} 2>/tmp/aist-gh-pr.err | awk '/^http/ {print; exit}' || true)"`,
    '    if [ -z "$prUrl" ] && [ -s /tmp/aist-gh-pr.err ]; then prError="$(cat /tmp/aist-gh-pr.err)"; fi',
    '  fi',
    'else',
    '  prError="GitHub CLI is not installed in the autonomous container."',
    'fi',
    'printf "changed=%s\\n" "$changed"',
    'printf "commitSha=%s\\n" "$commitSha"',
    'if [ -f /tmp/aist-diff-summary.txt ]; then printf "diffSummaryBase64=%s\\n" "$(base64 -w0 /tmp/aist-diff-summary.txt 2>/dev/null || base64 /tmp/aist-diff-summary.txt)"; fi',
    'printf "headSha=%s\\n" "$(git rev-parse HEAD)"',
    'printf "pushed=%s\\n" "$changed"',
    'printf "prUrl=%s\\n" "$prUrl"',
    'printf "prError=%s\\n" "$prError"'
  ].join('\n');
}

function createCommitMessage({ prompt, sessionId }: { prompt: string; sessionId: string }): string {
  const firstLine = prompt.trim().split(/\r?\n/)[0]?.trim() || 'isolated agent update';
  return `chore: ${firstLine.slice(0, 64)}\n\nAIST isolated session: ${sessionId}`;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-');
}
