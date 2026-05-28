# 011 — Core agent loop and run service event bus

## Priority

P1 — central milestone, very high complexity.

## Goal

Перенести agent loop и run service в core так, чтобы запуск агента управлялся через adapters, repositories и typed event bus, а не через `AgentController.sendState`.

## Context

`AgentRunService` управляет busy/activity/retry/approval/telemetry/reflection, а `loop.ts` выполняет model -> tools -> model. Это сердце будущего CLI. Перенос должен быть инкрементальным: extension может продолжать пользоваться wrapper-ом.

## Scope

- Создать core `AgentRuntimeService` или `RunService` с dependencies:
  - chat repository/session state;
  - model client;
  - tool registry/runner;
  - config snapshot provider;
  - prompt/context/memory providers;
  - event sink;
  - logger.
- Перенести retry policy, model request status, activity stream events, repeated tool-call guard.
- Перенести compaction trigger hooks без автопереключения UI.
- Перенести post-run reflection как optional background task через model client.
- Добавить event bus events для `run.started`, `activity`, `model.request.updated`, `message.appended`, `tool.*`, `run.finished`, `run.error`.
- Extension wrapper должен маппить events обратно в текущий `ChatStore`/state, пока UI не thin client.

## Out of scope

- Daemon.
- CLI command implementation.
- Полное удаление старого `AgentRunService`.

## Implementation notes

- Один active run per chat/workspace: при busy новый prompt отклоняется или возвращает structured error.
- AbortController остаётся runtime state, но сериализуемый run meta пишется в repository.
- Не хранить system prompt в persistable history.
- Streaming deltas должны идти events, а не напрямую в UI callbacks.

## Acceptance criteria

- Core run service можно запустить в unit/integration test без VS Code.
- Extension wrapper продолжает поддерживать обычный chat ask.
- Retry/model request statuses сохраняют текущую информативность.
- Tests покрывают success, retryable error, deny-stop, deny-continue и stop.

## Suggested verification

- `npm run typecheck`
- Focused runtime tests без VS Code mocks
- Existing extension runtime tests
