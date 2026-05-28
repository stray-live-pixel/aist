# 019 — Autonomous runner integration with CLI backend

## Priority

P4 — consolidation after interactive agent migration, high complexity.

## Goal

Подключить native autonomous runner к общему CLI/backend storage, model clients, secrets и event infrastructure.

## Context

`src/extension/autonomous/**` уже почти Node-safe и хранит sessions в workspace `.aist-agent/autonomous`. Но controller всё ещё VS Code-specific, а engines создают clients внутри extension. После daemon integration autonomous должен использовать общий backend вместо отдельной extension shell.

## Scope

- Выделить autonomous core modules в общий Node-safe слой, если это ещё не сделано.
- Подключить autonomous engines к model transport adapters и global secret store.
- Добавить CLI команды:
  - `aist autonomous list`;
  - `aist autonomous flow start <flowId> --jsonl`;
  - `aist autonomous run start <runId> --jsonl`;
  - `aist autonomous stop <sessionId>`;
  - `aist autonomous export <sessionId>`.
- Подключить daemon API для autonomous state/events.
- Extension autonomous dashboard должен читать state из daemon или shared backend, не из отдельного controller state.
- Сохранить текущие storage paths `.aist-agent/autonomous`.

## Out of scope

- Полный parity со старым `prompt/` shell/python runtime, если уже удалён/не используется.
- Новый UI redesign.

## Implementation notes

- Autonomous errors не должны append-иться в interactive chat.
- Chat stop и autonomous stop остаются разными lifecycle commands.
- Shared model clients/secrets уменьшают дублирование auth.
- Batch moving issues->done сохраняет текущий invariant: только после успешного non-dry final repeat.

## Acceptance criteria

- Autonomous CLI dry-run и fake-engine tests проходят.
- Extension autonomous dashboard работает через новый backend path.
- Storage remains workspace `.aist-agent/autonomous`.
- Interactive chat state не зависит от autonomous sessions.

## Suggested verification

- `npm run typecheck`
- `npm run test -- --run src/extension/autonomous` или перенесённые core autonomous tests
- Manual dry-run autonomous flow
