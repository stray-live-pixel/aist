# 020 — Remove duplicated legacy extension runtime

## Priority

P5 — final cleanup after parity, very high risk if done early.

## Goal

Удалить старый in-extension backend/runtime после того, как CLI/daemon path достиг parity и стал default source of truth.

## Context

Пока миграция идёт, fallback legacy runtime снижает риск. Но после успешного daemon mode дублирование будет мешать поддержке: два ChatStore, два AgentRunService, два tool runner path. Эта задача должна выполняться только после review parity checklist.

## Scope

- Удалить или сильно сократить legacy `AgentRunService`, old `ChatStore` Memento path и direct model/tool execution из extension.
- Оставить VS Code-specific adapters:
  - webview host;
  - daemon process manager/client;
  - editable diff preview provider;
  - openWorkspaceFile;
  - active editor context provider;
  - notifications/status.
- Удалить feature flags fallback, если product decision подтверждён.
- Обновить docs/README/architecture notes.
- Удалить obsolete tests или перенести их на core/daemon tests.
- Проверить package size/build entries.

## Out of scope

- Новые CLI features.
- Storage migration old Memento chats; решение остаётся «не нужна», если не изменено отдельно.

## Implementation notes

- Перед удалением составить parity checklist: ask, stop, approvals, preview edit, tool permissions, memory, compaction, reflection, telemetry, settings, Codex/OpenRouter auth, autonomous if included.
- Не удалять shared webview IPC types, если UI всё ещё их использует.
- Если какой-то сценарий не достиг parity, issue должна блокироваться, а не удалять fallback.

## Acceptance criteria

- Extension работает как thin client и не содержит второго backend source of truth.
- Все runtime unit tests живут в core/cli/daemon слоях.
- Build/typecheck/test проходят.
- Документация описывает CLI/daemon как единственный backend.

## Suggested verification

- `npm run typecheck`
- `npm run test`
- `npm run build`
- Manual full extension smoke in daemon mode
