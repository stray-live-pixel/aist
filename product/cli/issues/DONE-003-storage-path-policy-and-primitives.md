# 003 — Workspace/global path policy and atomic storage primitives

## Priority

P0 — foundational, medium complexity.

## Goal

Создать Node-safe storage primitives и path policy для будущего CLI/backend: workspace артефакты пишутся в workspace `.aist-agent`, secrets/config global fallback — в `~/.aist-agent`.

## Context

В проекте уже есть несколько файловых stores (`agentConfigStore`, memory, telemetry, autonomous session store), но правила путей размазаны. Для CLI нужен единый слой, который не зависит от VS Code и не позволит случайно записать секреты в репозиторий.

## Scope

- Добавить core/node модуль storage paths:
  - `workspaceAistRoot(workspaceRoot) -> <workspace>/.aist-agent`;
  - `globalAistRoot(homeDir?) -> ~/.aist-agent`;
  - helpers для chats/runs/memory/telemetry/tools/autonomous.
- Добавить atomic write helpers: JSON temp+rename, append JSONL, safe mkdir.
- Добавить path traversal guards для workspace-relative paths.
- Добавить gitignore safeguard docs: secrets не должны попадать в workspace `.aist-agent`.
- Покрыть tests: atomic write, append JSONL, path traversal, разделение workspace/global.

## Out of scope

- Перенос конкретных stores на новые helpers.
- Шифрование секретов.
- Daemon locking.

## Implementation notes

- Использовать только Node `fs/path/os`, без `vscode.Uri`.
- Atomic write должен писать temp рядом с target и делать rename.
- JSONL append должен создавать директорию и не переписывать существующий log.
- Ошибки storage должны быть структурированными, чтобы CLI мог вернуть понятный код.

## Acceptance criteria

- Есть reusable primitives для всех следующих file-backed задач.
- Tests доказывают, что global и workspace roots не смешиваются.
- Workspace path guard запрещает `..`, absolute paths и path traversal.
- Текущий extension behavior не изменён.

## Suggested verification

- `npm run typecheck`
- Focused unit tests для нового storage модуля
