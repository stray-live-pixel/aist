# 018 — VS Code thin-client daemon integration

## Priority

P3 — strategic UX migration, very high complexity.

## Goal

Перевести VS Code extension на thin-client взаимодействие с `aist daemon`: extension запускает/находит backend, проксирует webview commands и отображает state/events.

## Context

Целевая архитектура: CLI/daemon — source of truth, VS Code extension — клиент. После daemon MVP нужно подключить extension к нему, сохранив UI и VS Code-specific capabilities.

## Scope

- Добавить daemon process manager в extension:
  - найти bundled/local `aist` binary;
  - запустить `aist daemon --workspace <root>`;
  - restart/backoff on crash;
  - показать diagnostics при ошибке.
- Реализовать daemon client adapter для webview commands:
  - chat/new/delete/setModel/ask/stop/approval/config/memory/tools.
- Маппить daemon state/events в текущий `AgentState` webview shape.
- Реализовать VS Code capability callbacks:
  - open workspace file;
  - editable diff preview approval;
  - notifications;
  - active editor context snapshots.
- Сохранить fallback на old in-extension runtime за feature flag до parity.
- Добавить integration tests/mocks для daemon client.

## Out of scope

- Удаление legacy runtime.
- Desktop/web clients.
- Remote auth/session security.

## Implementation notes

- Preview edit callback может требовать daemon -> extension request/response; не пытаться выполнить VS Code diff внутри daemon.
- Extension не должен напрямую писать chat history, если daemon mode включён.
- On webviewReady extension отправляет последний daemon state и подписывается на events.
- Если daemon unavailable, UI должен показать понятную ошибку и предложить fallback/retry.

## Acceptance criteria

- В daemon mode обычный чат работает через backend.
- Approval и preview edits сохраняют текущий UX.
- Stop command останавливает daemon run.
- Старый runtime можно включить fallback flag.

## Suggested verification

- `npm run typecheck`
- Focused daemon client/extension adapter tests
- Manual extension smoke in daemon mode
