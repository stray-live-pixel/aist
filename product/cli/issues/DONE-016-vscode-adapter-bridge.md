# 016 — VS Code extension storage/runtime adapter bridge

## Priority

P2 — migration bridge, high complexity.

## Goal

Подключить новый core/backend-код к VS Code extension через adapter bridge, сохранив текущий webview UX и возможность отката.

## Context

После `chat ask --jsonl` CLI уже умеет запускать агента headless. Но extension всё ещё использует старый `ChatStore` и `AgentRunService`. Нужен промежуточный bridge, чтобы UI мог постепенно переходить на file-backed storage/runtime без daemon.

## Scope

- Добавить VS Code adapters для:
  - workspace root provider;
  - active editor context provider;
  - VS Code preview edit provider;
  - notification/status messages;
  - logger;
  - config/secret adapters.
- Добавить feature flag/config `openrouterAgent.useCoreRuntime` или internal toggle, default off/on по решению issue.
- При включённом bridge webview commands используют core run service/repositories, но statePresenter отдаёт тот же UI shape.
- Сохранить старый path как fallback до daemon integration.
- Добавить tests на state mapping и adapter behavior с mocks.

## Out of scope

- Daemon.
- Удаление старого runtime.
- Миграция Memento чатов.

## Implementation notes

- Не ломать текущие sidebar/editor surfaces.
- Preview edits должны использовать protocol из issue 009 и текущий editable diff UI.
- Если feature flag off, поведение extension должно быть идентичным текущему.
- Если feature flag on, новые чаты могут быть file-backed; явно указать это в release notes/dev docs.

## Acceptance criteria

- Extension компилируется и работает в старом режиме.
- Core runtime mode можно включить для smoke test.
- Webview получает привычный state shape.
- Preview edit approval работает в core mode.

## Suggested verification

- `npm run typecheck`
- Focused adapter/statePresenter tests
- Manual extension smoke: ask, read tool, edit preview, stop
