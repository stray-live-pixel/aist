import type { PrepareContainerWorkspaceInput } from './ContainerWorkspace';

/**
 * Что это: собирает bash-сценарий автономной подготовки контейнера.
 * Зачем нужно: внутри Docker нужно установить базовые утилиты, склонировать GitHub-репозиторий, поставить AIST и создать ветку.
 * Какую продуктовую проблему решает: контейнер сам содержит весь рабочий контекст агента и не зависит от файлов компьютера, где запущен Docker.
 */
export function buildContainerBootstrapScript({ input }: { input: PrepareContainerWorkspaceInput }): string {
  const targetBaseRef = input.baseRef || 'HEAD';
  return [
    'set -euo pipefail',
    'export DEBIAN_FRONTEND=noninteractive',
    'if ! command -v git >/dev/null 2>&1; then apt-get update && apt-get install -y --no-install-recommends git ca-certificates; fi',
    'if ! command -v bash >/dev/null 2>&1; then apt-get update && apt-get install -y --no-install-recommends bash; fi',
    'if ! command -v npm >/dev/null 2>&1; then apt-get update && apt-get install -y --no-install-recommends npm; fi',
    'git config --global --add safe.directory /workspace',
    'rm -rf /workspace',
    `git clone ${quote(input.remoteUrl)} /workspace`,
    'cd /workspace',
    'git fetch origin --prune --depth=50 || true',
    buildCheckoutCommand({ branchName: input.branchName, targetBaseRef }),
    'npm install',
    'npm run build:cli',
    'npm link --force',
    'printf "remote=%s\\n" "$(git remote get-url origin)"',
    'printf "baseSha=%s\\n" "$(git rev-parse HEAD)"',
    'printf "branch=%s\\n" "$(git branch --show-current)"'
  ].join('\n');
}

function buildCheckoutCommand({ branchName, targetBaseRef }: { branchName: string; targetBaseRef: string }): string {
  return [
    `BASE_REF=${quote(targetBaseRef)}`,
    'if [ "$BASE_REF" != "HEAD" ] && git rev-parse --verify --quiet "origin/$BASE_REF" >/dev/null; then',
    '  BASE_REF="origin/$BASE_REF"',
    'fi',
    `if git rev-parse --verify --quiet ${quote(`origin/${branchName}`)} >/dev/null; then`,
    `  git checkout -B ${quote(branchName)} ${quote(`origin/${branchName}`)}`,
    'else',
    `  git checkout -B ${quote(branchName)} "$BASE_REF"`,
    'fi'
  ].join('\n');
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
