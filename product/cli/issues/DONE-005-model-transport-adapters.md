# 005 — Model transport adapters for OpenRouter and Codex

## Priority

P0 — required before headless runs, medium/high complexity.

## Goal

Отвязать OpenRouter и Codex clients от VS Code settings/secrets, чтобы model transport можно было использовать из CLI/backend и extension adapter.

## Context

`src/extension/openrouter/client.ts` читает `vscode.workspace.getConfiguration`, а `src/extension/codex/client.ts` зависит от `vscode.ExtensionContext`, `vscode.env.openExternal` и `context.secrets`. Для CLI нужны transport classes с dependency injection.

## Scope

- Создать core/node-safe model transport interfaces:
  - `ModelClient.chat(...)`;
  - `ModelCatalogClient.listModels()`;
  - lifecycle/stream callbacks.
- Переписать OpenRouter client так, чтобы config передавался через adapter/options, а не читался внутри `chat`.
- Разделить Codex client на:
  - transport для Responses API;
  - auth/session/token provider;
  - VS Code login UI adapter, который пока остаётся в extension.
- Сохранить public wrapper для extension, чтобы существующий `AgentController` продолжил работать.
- Добавить tests на payload mapping без реальных HTTP запросов.

## Out of scope

- CLI auth commands.
- Замена OAuth browser flow в CLI.
- Изменение списка fallback-моделей.

## Implementation notes

- Fetch лучше инжектировать или мокать через thin helper для unit tests.
- Codex service tier normalization остаётся в config layer.
- Ошибки `ModelRequestError` должны остаться structured и serializable.
- Не ломать streaming callbacks: они нужны и CLI JSONL, и VS Code activity preview.

## Acceptance criteria

- Model clients можно создать без импорта `vscode` в core/node layer.
- Старый extension path компилируется и работает через adapter wrapper.
- Unit tests покрывают OpenRouter/Codex payload и usage parsing.
- Ошибки model request сохраняют endpoint/status/body summary.

## Suggested verification

- `npm run typecheck`
- `npm run test -- --run src/extension/openrouter src/extension/codex`
