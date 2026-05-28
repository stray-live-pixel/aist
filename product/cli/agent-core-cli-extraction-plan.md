# План выноса core агента в самостоятельное Node.js CLI

## Зачем это делать

Вынос core части AIST из VS Code extension в отдельное Node.js CLI-приложение осмыслен и полезен. Сейчас extension одновременно является UI, backend, runtime-оркестратором, хранилищем чатов и адаптером к VS Code API. Это удобно для MVP, но мешает программному запуску агента, будущему desktop/web UI и переиспользованию backend-логики без VS Code.

Целевая модель: `aist` CLI становится единой backend-базой агента, а VS Code extension, будущий desktop и web-клиент становятся thin clients, которые общаются с этим backend через IPC/HTTP/stdio и отображают состояние.

## Текущая механика агента

Основной interactive agent сейчас распределён по `src/extension/agent/` и завязан на VS Code:

- `AgentController` связывает команды VS Code, webview surfaces, `ChatStore`, модельные клиенты, авторизацию Codex и `AgentRunService`.
- `AgentRunService` управляет active run: busy/activity, `AbortController`, approvals, retry, post-run reflection.
- `runtime/loop.ts` выполняет цикл `model -> tool calls -> model`.
- `runtime/toolRunner.ts` исполняет tool calls, approval flow, preview filesystem edits и записывает model-visible tool result.
- `chats/ChatStore` хранит историю чатов в `vscode.Memento`.
- `config/agentConfigStore.ts`, `memory/memory.ts`, `runtime/telemetry.ts`, autonomous storage уже частично используют файлы `.aist-agent`.
- `openrouter/client.ts` и `codex/client.ts` читают часть настроек из `vscode.workspace.getConfiguration`, Codex auth хранится в `context.secrets`.
- `tools/filesystemTools.ts` зависит от VS Code filesystem, diff editor, document symbols, active editor и workspace API.
- Webview state собирается в `webview/statePresenter.ts` напрямую из extension-модулей.

Главная проблема: runtime state, настройки, секреты, чаты, инструменты и UI lifecycle смешаны в extension. Поэтому агент нельзя стабильно запускать как обычный процесс без VS Code.

## Целевое разделение ответственности

### 1. `@aist/core`

Чистый TypeScript/Node пакет без импорта `vscode`.

Отвечает за:

- доменную модель чатов, сообщений, runs, approvals, tools, prompt config, memory, telemetry;
- agent loop и retry policy;
- context governor;
- compaction;
- reflection candidates;
- tool registry;
- модельные transport interfaces;
- storage interfaces;
- события runtime для любых UI.

Не отвечает за:

- VS Code webview;
- VS Code diff preview;
- VS Code settings/secrets;
- нативные уведомления конкретной оболочки.

### 2. `@aist/cli` / бинарь `aist`

Node.js приложение, которое использует core и предоставляет backend API.

Режимы запуска:

- `aist chat ask --chat <id> "prompt"` — одноразовый программный запуск.
- `aist chat stream --chat <id>` — streaming events в stdout JSONL.
- `aist daemon` — долгоживущий backend для VS Code/desktop/web.
- `aist tools list`, `aist chats list`, `aist config get/set`, `aist models refresh`.
- `aist run stop <runId>`, `aist approval resolve <approvalId> ...`.

CLI отвечает за:

- файловое хранилище `.aist-agent`;
- секреты и auth storage;
- Node filesystem tools;
- запуск agent core;
- IPC/HTTP API для клиентов;
- совместимость форматов state/events.

### 3. VS Code extension как thin client

Extension остаётся UI-интеграцией:

- открывает sidebar/editor webview;
- получает state/events от CLI daemon;
- отправляет пользовательские команды в CLI daemon;
- показывает VS Code-specific affordances: открыть файл, reveal in explorer, diff preview, notifications;
- по возможности не хранит собственную историю чатов и настройки агента.

## Единое хранилище

Рекомендуемый корень: `.aist-agent/` в workspace. Это уже соответствует текущим проектным правилам и позволяет коммитить проектные артефакты вместе с кодом.

Предлагаемая структура:

```text
.aist-agent/
├── settings.json
├── secrets.json.enc              # опционально; лучше OS keychain, но CLI должен иметь fallback
├── chats/
│   ├── index.json
│   └── <chatId>/
│       ├── meta.json
│       ├── messages.jsonl
│       ├── history.jsonl
│       ├── state.json
│       └── artifacts/
├── runs/
│   └── <runId>/
│       ├── meta.json
│       ├── events.jsonl
│       ├── approvals.jsonl
│       ├── tool-results.jsonl
│       └── telemetry.json
├── memory.json
├── memory-events.jsonl
├── telemetry/
├── tools/
├── instructions/
└── autonomous/
```

Инварианты storage:

- `meta.json` и `state.json` пишутся атомарно через temp+rename.
- `messages.jsonl`, `history.jsonl`, `events.jsonl` append-only.
- Большие tool outputs не попадают в model history целиком: UI result хранится в artifact/tool-result, model result остаётся compact.
- Без workspace CLI может работать только в user/global режиме для глобальных команд; agent run по проекту должен требовать workspace root.
- Должен быть migration layer из текущего `vscode.Memento` в `.aist-agent/chats/`.

## Backend API для клиентов

Нужен стабильный transport-agnostic контракт. Начать проще с JSON-RPC поверх stdio или Unix socket, затем добавить HTTP/WebSocket для desktop/web.

Минимальные команды:

```text
initialize(workspaceRoot)
state.get()
chat.create(model?)
chat.list()
chat.get(chatId)
chat.ask(chatId, prompt)
chat.stop(runId)
chat.compact(chatId, trigger)
chat.setModel(chatId, model)
approval.resolve(approvalId, decision)
config.get()
config.update(patch)
models.refresh(force)
tools.list()
memory.list/add/delete/setEnabled
files.openRequestAck(...) # UI-specific callback boundary
```

События backend -> client:

```text
state.changed
run.started
run.activity
model.request.updated
tool.waitingForApproval
tool.started
tool.finished
tool.denied
message.appended
chat.updated
run.finished
run.error
```

Важно сохранить event-driven модель без обязательного request-id для agent events, но backend API команды должны возвращать `runId`/`operationId`, чтобы внешние программы могли коррелировать запуск.

## Что переносить из VS Code в core/CLI

### Перенести почти без изменений

- `runtime/loop.ts`
- `runtime/errors.ts`
- `runtime/toolCalls.ts`
- `runtime/toolResultCompaction.ts`
- `runtime/usage.ts`
- `runtime/compaction.ts`
- `context/contextGovernor.ts`
- `config/prompts.ts`
- `config/systemPrompt.ts` после отвязки от VS Code settings
- `memory/memory.ts` после нормализации путей
- `runtime/reflection.ts`
- `runtime/telemetry.ts`
- `tools/applyPatch.ts`
- `tools/semanticEdit.ts`
- `tools/projectTools.ts`
- `autonomous/*` core-модули, которые уже почти не зависят от VS Code

### Переписать через adapters

- `ChatStore`: заменить `vscode.Memento` на file-backed `ChatStorage`.
- `OpenRouterClient`: settings передавать через dependency/config object, не читать `vscode.workspace`.
- `CodexClient`: auth storage вынести в `SecretStore` interface.
- `tools/filesystemTools.ts`: разделить на Node filesystem tools и VS Code UI preview adapter.
- `settingsSnapshot.ts`: читать из CLI config store.
- `AgentRunService`: оставить как core service, но заменить callbacks на event emitter и storage transactions.

### Оставить в VS Code adapter

- webview host, surfaces, state posting;
- `openWorkspaceFile`;
- active editor context provider;
- editable diff preview через VS Code;
- document symbols для `outline_file` как optional capability;
- status bar messages, notifications;
- commands registration.

## Инструменты после выноса

Нужно разделить tools на capability groups:

1. Core Node tools:
   - `list_files`
   - `read_file`
   - `read_file_range`
   - `grep_search`
   - `run_bash_script`
   - `write_file`
   - `replace_in_file`
   - `apply_patch`
   - `create_directory`
   - `delete_path`
   - project tools
   - planning tools

2. UI-assisted tools:
   - `edit_file` с preview approval.
   - `openWorkspaceFile` как клиентская команда, не model tool.
   - `outline_file` через VS Code LSP или fallback через tree-sitter/tsserver в CLI позже.

На первом этапе CLI может исполнять `edit_file` без интерактивного VS Code diff, но с `--approval-mode ask|auto|never` и сохранением unified diff artifact. VS Code client сможет показывать diff preview, отправлять approved/denied обратно, а CLI будет source of truth.

## Секреты и авторизация

Цель: auth принадлежит CLI/backend, не extension.

Варианты:

- primary: OS keychain через `keytar` или аналог;
- fallback для CI/headless: env vars (`OPENROUTER_API_KEY`, Codex token path) или encrypted file;
- workspace settings не должны хранить токены в plaintext;
- VS Code extension только вызывает `aist auth login codex` или backend method `auth.loginCodex`.

OpenRouter API key тоже лучше хранить в user-level CLI secret store, а не в VS Code settings.

## Миграционный план

### Фаза 0. Контракт и инвентаризация

- Зафиксировать границы `core`, `cli`, `vscode-adapter`.
- Описать JSON schemas для chats, runs, events, config, approvals.
- Добавить ADR: VS Code больше не source of truth.
- Выбрать transport для MVP: stdio JSON-RPC или local socket.

### Фаза 1. File-backed storage

- Создать `src/core/storage` или `src/cli/storage` с `.aist-agent/chats` и `.aist-agent/runs`.
- Реализовать `ChatRepository` вместо `ChatStore` на `vscode.Memento`.
- Добавить миграцию из старого workspaceState в `.aist-agent/chats` при запуске extension.
- Перевести memory/telemetry/config на единые пути и атомарные операции.

### Фаза 2. Core runtime без VS Code

- Перенести agent loop, run service, compaction, reflection, usage, tool result compaction в core.
- Заменить `sendState` callbacks на typed event bus.
- Убрать прямые зависимости от `vscode` из runtime.
- Покрыть core unit-тестами без моков VS Code.

### Фаза 3. CLI MVP

- Добавить бинарь `aist`.
- Реализовать команды:
  - `aist chat new`
  - `aist chat list`
  - `aist chat ask --chat <id> --prompt <text> --jsonl`
  - `aist run stop <runId>`
  - `aist config get/set`
- Сделать stdout JSONL events для программного запуска.
- Поддержать non-interactive approval policy: `ask`, `auto-readonly`, `auto-all`, `deny`.

### Фаза 4. CLI daemon

- Реализовать `aist daemon --workspace <path>`.
- Добавить JSON-RPC/WebSocket API.
- Сохранять active runs в `.aist-agent/runs`.
- Позволить нескольким клиентам подписываться на один backend state.

### Фаза 5. VS Code thin client

- Extension при старте ищет/запускает `aist daemon`.
- Webview state приходит из daemon, а не собирается из `ChatStore`.
- Команды webview проксируются в daemon.
- VS Code-specific actions остаются локальными adapter callbacks.
- Удалить хранение чатов из `vscode.Memento` после успешной миграции.

### Фаза 6. Desktop/web readiness

- Зафиксировать public API backend.
- Добавить auth/session layer для web UI.
- Отделить browser-safe shared types.
- Подготовить packaging daemon как embedded backend для desktop app.

## Риски

- **Preview edits.** VS Code diff preview сейчас является частью approval UX. В CLI нужен fallback: diff artifact + approve command.
- **Secrets.** Нельзя просто перенести `context.secrets` в plaintext file.
- **Concurrent clients.** Несколько UI могут одновременно слушать и менять один run; нужен locking/operation ids.
- **Backward compatibility.** Пользовательские чаты в `Memento` нельзя потерять.
- **Tool permissions.** Поведение `auto/ask` должно быть одинаковым в CLI и VS Code.
- **Node-only outline.** `outline_file` зависит от VS Code LSP; CLI fallback может быть хуже до отдельной реализации.

## Рекомендуемый MVP scope

Для первого полезного результата достаточно:

1. File-backed chats/runs в `.aist-agent`.
2. Core run service без VS Code imports.
3. CLI command `aist chat ask --jsonl`.
4. OpenRouter/Codex clients с config/secret adapters.
5. Node filesystem tools без VS Code preview.
6. VS Code extension пока может оставаться старым UI, но читать/писать через новый storage adapter.

После этого уже можно программно запускать агента из скриптов и постепенно переводить extension на daemon API.

## Оценка полезности

Полезность высокая, если цель — не только VS Code extension, а полноценная агентская платформа. Вынос backend делает возможными:

- headless/CI запуск агента;
- batch/autonomous сценарии без webview;
- desktop/web клиенты на общей базе;
- единые чаты, память, настройки и telemetry;
- тестирование runtime без VS Code mocks;
- более чистую архитектуру и меньше product lock-in.

Цена перехода средняя/высокая: затрагиваются storage, clients, tools, approvals и UI state. Поэтому миграцию лучше делать инкрементально через adapter interfaces, не переписывая весь agent за один шаг.

## Итоговое решение

Вынос core агента в Node.js CLI стоит делать. Правильный целевой дизайн: `aist` CLI/daemon становится source of truth для истории, настроек, runs, approvals, tools и model requests; VS Code extension становится одним из клиентов. Такой переход напрямую поддерживает программный запуск агента и будущие desktop/web приложения на общей backend базе.
