# 002 — Shared runtime contracts without VS Code imports

## Priority

P0 — foundational, low/medium complexity.

## Goal

Вынести доменные контракты агента в Node-safe слой, чтобы extension, CLI и будущий daemon использовали одни типы сообщений, runs, tools, approvals и events.

## Context

Сейчас типы распределены между `src/extension/agent/types.ts`, `src/extension/chats/types.ts`, `src/extension/openrouter/types.ts` и webview contracts. Core runtime нельзя переносить, пока базовые типы находятся в extension-namespace и местами импортируют `vscode`.

## Scope

- Создать `src/core/types/` или эквивалентный модуль с типами:
  - chat/message/history/usage/context;
  - run/run status/activity/model request;
  - tool call, tool result, approval decision;
  - model transport message/tool/usage;
  - runtime events для CLI/daemon clients.
- Перенести или продублировать только type-only контракты без runtime-кода.
- Обновить extension-модули на type-only imports из core там, где это не меняет поведение.
- Оставить compatibility exports в старых файлах, если это уменьшает объём изменений.
- Добавить type-level или compile tests для дискриминированных union events.

## Out of scope

- Перенос `WebviewMessage` contracts в core: webview остаётся adapter-specific, кроме событий backend->client.
- Переписывание `ChatStore`.
- Изменение serializable shape сообщений в persisted state.

## Implementation notes

- Не импортировать `vscode` из core типов; если нужен URI/Range — использовать plain serializable shape.
- Для будущего daemon все events должны быть JSON-serializable.
- Сохранить существующие имена полей, где это возможно, чтобы снизить churn.
- Добавить JSDoc к важным типам: почему event-driven модель допускает много событий на один user prompt.

## Acceptance criteria

- Core содержит единый набор Node-safe runtime contracts.
- Extension продолжает компилироваться через compatibility exports или обновлённые imports.
- Нет циклической зависимости core -> extension.
- Существующие тесты на chat/runtime не требуют массового переписывания.

## Suggested verification

- `npm run typecheck`
- `npm run test -- --run src/extension/chats src/extension/agent/runtime`
