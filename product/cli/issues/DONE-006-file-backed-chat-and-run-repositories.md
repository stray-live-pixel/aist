# 006 — File-backed chat and run repositories

## Priority

P0 — required for CLI source of truth, high complexity.

## Goal

Добавить file-backed repositories для новых chats и runs в workspace `.aist-agent`, не мигрируя старые `vscode.Memento` чаты.

## Context

`ChatStore` сейчас хранит всё в `vscode.Memento`, что недоступно CLI. Пользователь разрешил не делать backward compatibility migration. Поэтому можно создать новое хранилище и подключать его постепенно.

## Scope

- Реализовать `ChatRepository` с workspace paths:
  - `.aist-agent/chats/index.json`;
  - `.aist-agent/chats/<chatId>/meta.json`;
  - `.aist-agent/chats/<chatId>/messages.jsonl`;
  - `.aist-agent/chats/<chatId>/history.jsonl` или `history.json` с понятным rationale;
  - `.aist-agent/chats/<chatId>/state.json` для transient resumable state, если нужно.
- Реализовать `RunRepository`:
  - `.aist-agent/runs/<runId>/meta.json`;
  - `events.jsonl`, `approvals.jsonl`, `tool-results.jsonl`, `telemetry.json`.
- Добавить atomic writes и append-only logs через primitives из issue 003.
- Добавить tests на create/list/get/update/append и восстановление после restart.
- Сохранить старый `ChatStore` без переключения UI, если эта issue не готова к bridge.

## Out of scope

- Миграция Memento чатов.
- Перевод AgentController на новое хранилище.
- Daemon locking.

## Implementation notes

- IDs должны быть stable UUID/randomUUID.
- Large tool outputs должны храниться отдельно от model history или compact model result, как сейчас делает dual-channel.
- `index.json` нужен для быстрых списков, но source of truth по chat — его каталог; при повреждении index можно rebuild.
- Добавить русские JSDoc к storage invariants.

## Acceptance criteria

- CLI/core tests могут создать chat/run без VS Code.
- Storage файлы читаемы человеком и append-only там, где это важно.
- Нет записи secrets в workspace `.aist-agent`.
- Extension behavior пока не меняется.

## Suggested verification

- `npm run typecheck`
- Focused unit tests для chat/run repositories
