# 014 — CLI chat storage commands

## Priority

P2 — required for `chat ask`, medium complexity.

## Goal

Добавить CLI команды для управления file-backed chats без запуска модели.

## Context

Перед `aist chat ask` нужно уметь создавать, читать и перечислять чаты из нового repository. Старые Memento-чаты не мигрируются.

## Scope

- Реализовать команды:
  - `aist chat new --workspace <path> --model <model?>`;
  - `aist chat list --workspace <path> --json?`;
  - `aist chat get <chatId> --workspace <path> --json?`;
  - `aist chat clear <chatId> --workspace <path>`;
  - `aist chat set-model <chatId> <model> --workspace <path>`.
- Использовать `ChatRepository` из issue 006.
- Печатать human-friendly output и `--json` output.
- Добавить tests на команды с temp workspace.
- Не подключать VS Code Memento и не пытаться мигрировать старые чаты.

## Out of scope

- `chat ask`.
- Compaction.
- Webview integration.

## Implementation notes

- Если workspace не указан, использовать current working directory, но явно валидировать путь.
- Empty workspace должен создать `.aist-agent/chats` при первом write.
- JSON output должен быть stable для будущих scripts.
- Ошибки missing chat должны возвращать non-zero exit code и structured JSON в `--json` режиме.

## Acceptance criteria

- Пользователь может создать chat из CLI и увидеть файлы в workspace `.aist-agent/chats`.
- CLI list/get показывают новые чаты.
- Tests не требуют VS Code.
- Extension behavior не меняется.

## Suggested verification

- `npm run typecheck`
- Focused CLI chat command tests
- Manual temp workspace smoke
