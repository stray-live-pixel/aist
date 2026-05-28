# 007 — Move prompt, memory, telemetry, usage helpers to core

## Priority

P1 — medium/high value, medium complexity.

## Goal

Перенести чистые helper-модули prompt/memory/telemetry/usage в core/node-safe слой, чтобы ими пользовались и CLI, и extension.

## Context

Часть модулей уже почти не зависит от VS Code: `prompts.ts`, `systemPrompt.ts` после adapters, `memory.ts`, `telemetry.ts`, `usage.ts`, `compaction.ts`, `reflection.ts`, `contextGovernor.ts`. Их перенос уменьшит future diff для run service.

## Scope

- Перенести или создать core-версии:
  - prompt builder и language policy;
  - instruction source formatter;
  - context governor;
  - compaction helpers;
  - reflection parsing/validation;
  - memory sanitize/retrieve/format;
  - telemetry aggregation/export;
  - usage helpers.
- Заменить VS Code/workspace reads на injected config/path providers.
- Оставить extension compatibility exports.
- Перенести существующие unit tests ближе к core или добавить parallel tests.
- Обновить snapshots только если prompt contract намеренно изменился.

## Out of scope

- Agent loop/tool execution.
- File-backed chat storage integration.
- Webview state changes.

## Implementation notes

- Prompt snapshots — high-signal tests; не расширять base prompt без необходимости.
- Memory storage paths должны использовать path policy из issue 003.
- Telemetry не должна содержать raw prompts/tool outputs/secrets.
- Все core модули должны быть JSON/Node-safe и без `vscode` imports.

## Acceptance criteria

- Core содержит reusable prompt/context/memory/telemetry helpers.
- Старые extension imports либо обновлены, либо re-export работают.
- Существующие prompt/memory/telemetry tests проходят.
- Сборка extension не меняет UI behavior.

## Suggested verification

- `npm run typecheck`
- `npm run test -- --run prompt memory telemetry context compaction reflection usage`
