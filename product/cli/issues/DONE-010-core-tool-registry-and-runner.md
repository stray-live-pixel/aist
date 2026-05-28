# 010 — Core tool registry and tool runner

## Priority

P1 — required for core run service, high complexity.

## Goal

Перенести tool registry и tool runner в core/adapters архитектуру, чтобы model-requested tools исполнялись без прямой зависимости от VS Code.

## Context

`runtime/toolRegistry.ts` и `runtime/toolRunner.ts` сейчас зависят от extension stores, VS Code approval notifications, filesystem tools, skills и project tools. Для CLI нужен runner с capability adapters: filesystem, project tools, skills, planning, approval, memory.

## Scope

- Создать core `ToolRegistry` interface и implementation, объединяющую builtin, skills, project tools.
- Перенести project tool discovery/execution в Node-safe layer или подключить существующий Node-safe модуль.
- Создать `ToolRunner` с dependencies:
  - chat/run repository или mutable run context;
  - approval service;
  - memory service;
  - filesystem tool executor;
  - telemetry recorder;
  - event emitter.
- Сохранить dual-channel result: full UI/artifact result отдельно, compact model result в history.
- Поддержать planning tools как chat/run state mutation без workspace writes.
- Добавить tests на approve/deny/error/compaction/repeated outputs.

## Out of scope

- Полный AgentRunService перенос.
- CLI command routing.
- VS Code system notifications.

## Implementation notes

- Runner не должен знать про webview или `vscode.window`.
- Approval notification — adapter responsibility.
- Project tool disabled ids должны приходить из config adapter.
- Skills execution должна использовать safe workspace cwd и structured errors.

## Acceptance criteria

- Core tool runner исполняет planning, Node filesystem, project и skill tools через adapters.
- Existing extension tool flow можно обернуть через adapter без массового UI переписывания.
- Tests покрывают модель-visible result и сохранение full result.
- Нет `vscode` imports в core runner.

## Suggested verification

- `npm run typecheck`
- Focused unit tests tool runner/tool registry/tool result compaction
