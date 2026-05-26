# 001 — Целевая архитектура нативного autonomous runner

## Статус

DONE — архитектурное решение зафиксировано в `src/extension/autonomous/README.md`.

## Цель

Перенести функциональность проекта `prompt/` в текущий VS Code extension как нативный TypeScript/Node-домен AIST. Папка `prompt/` должна стать временным миграционным источником форматов и поведения, а после достижения parity — быть удалена.

Это **не** задача «запускать `prompt/agent-auto.sh` из UI». Shell/Python runner, `prompt/src/run_flow.py`, `prompt/src/run_batch.py`, `prompt/src/server.py` и standalone HTML UI должны быть заменены TypeScript/Node реализацией внутри extension.

## Принятые решения

- `prompt/` — только миграционный источник, не runtime dependency.
- Целевой домен backend: `src/extension/autonomous/`.
- Целевой workspace storage root: `.aist-agent/autonomous/`, потому что `.aist-agent/settings.json` уже используется расширением.
- Session artifacts: `.aist-agent/autonomous/sessions/<sessionId>/`.
- Flow/run definitions: `.aist-agent/autonomous/flows/**` и `.aist-agent/autonomous/runs/**`.
- Engines: `claude-cli`, `codex-cli`, `openrouter-api`, `codex-api`.
- UI: React webview на existing shared UI components; кастомные primitives сначала добавляются в `src/webview/shared/ui`.
- Existing chat agent остаётся отдельным сценарием; `ChatStore` и `AgentRunService` не становятся autonomous runtime.

## Целевое продуктово-техническое состояние

Autonomous runner — неотъемлемая часть AIST:

- управляет flow/run задачами из VS Code UI;
- исполняет multi-stage flows без shell/python orchestrator;
- поддерживает batch runs;
- умеет работать через:
  - Claude Code CLI;
  - OpenAI Codex CLI;
  - текущий встроенный OpenRouter API-клиент;
  - текущий встроенный Codex API-клиент;
- пишет workspace-bound артефакты и логи;
- отображается в React webview на shared UI;
- архитектурно пригоден для будущего desktop app / standalone product.

## Почему не shell/Python wrapper

Старый план с `agent-auto.sh` как runtime-зависимостью плох для целевого продукта:

- extension остаётся зависимым от Unix shell и `python3`;
- Windows/desktop app становятся сложнее;
- логика flow/run раздваивается между Python и TypeScript;
- UI не может типобезопасно управлять lifecycle без парсинга внешних файлов;
- текущие встроенные API-клиенты OpenRouter/Codex нельзя естественно использовать в Python runner;
- папка `prompt/` продолжает быть отдельным проектом, а не частью AIST.

Поэтому migration direction: **переносим поведение, не оборачиваем старый runtime**.

## Архитектурные домены

```text
src/extension/autonomous/
├── controller.ts          # VS Code commands/webview orchestration
├── discovery.ts           # чтение flow/run definitions
├── frontmatter.ts         # TS parser для markdown frontmatter
├── engines/               # единый interface исполнения stage/direct prompt
│   ├── types.ts
│   ├── claudeCliEngine.ts
│   ├── codexCliEngine.ts
│   ├── openRouterEngine.ts
│   └── codexApiEngine.ts
├── flow/
│   ├── orchestrator.ts    # multi-stage flow execution
│   ├── contextResolver.ts # continue/continue-from/summary-from
│   └── promptBuilder.ts
├── batch/
│   └── runBatch.ts        # run packages, repeats, moving issues→done
├── storage/
│   ├── runStorage.ts      # sessions/logs/snapshots
│   └── eventLog.ts
├── presenter.ts
├── messages.ts
├── types.ts
└── errors.ts
```

## Отношение к текущему chat agent

Существующий chat agent остаётся отдельным сценарием:

- `AgentController` продолжает отвечать за chat/settings/editor surfaces;
- `AgentRunService` продолжает отвечать за interactive chat loop/tool approvals;
- `ChatStore` не становится хранилищем autonomous sessions;
- `OpenRouterClient` и `CodexClient` можно переиспользовать как engine adapters;
- filesystem tools можно переиспользовать через shared service только после выделения безопасного execution context, а не через chat approval UI.

## Engine abstraction

Целевой interface:

```ts
export type AutonomousEngineId = 'claude-cli' | 'codex-cli' | 'openrouter-api' | 'codex-api';

export type AutonomousEngine = {
  id: AutonomousEngineId;
  displayName: string;
  supportsResume: boolean;
  supportsFork: boolean;
  run(input: AutonomousEngineRunInput, stream: AutonomousEngineStream): Promise<AutonomousEngineRunResult>;
  summarize?(input: AutonomousSummaryInput, stream: AutonomousEngineStream): Promise<AutonomousEngineRunResult>;
  forkSession?(sessionRef: AutonomousSessionRef): Promise<AutonomousSessionRef>;
};
```

CLI engines могут использовать внешние `claude`/`codex` binaries. API engines используют существующие extension clients и не требуют shell/python.

## Flow/run definitions и sessions

На первом этапе можно импортировать текущий формат `prompt/flows` и `prompt/runs`. Целевое расположение после миграции:

```text
.aist-agent/autonomous/flows/<flow>/.index.md
.aist-agent/autonomous/runs/<run>/.index.md
.aist-agent/autonomous/sessions/<sessionId>/...
```

Каталог `.aist-agent` уже используется расширением для workspace-настроек, поэтому autonomous definitions/sessions должны жить внутри него, чтобы не плодить второй скрытый корень. Важно: `prompt/` не остаётся runtime source of truth.

## UI

- React webview в существующем бандле.
- Только shared UI components.
- Если dashboard требует нового visual primitive — сначала `src/webview/shared/ui/...`, потом page.
- Standalone `prompt/src/shared/ui/*` не переносится как есть; его функциональность переосмысляется в React.

## Стратегия миграции

1. Снять parity matrix со старого `prompt/`.
2. Реализовать TS discovery и storage.
3. Реализовать engine abstraction.
4. Реализовать TS flow orchestrator.
5. Реализовать TS batch runner.
6. Реализовать monitoring/event log/snapshot.
7. Реализовать UI.
8. Перенести bundled default flows/runs или workspace template.
9. Добавить мигратор из `prompt/` в новый формат.
10. Удалить shell/python runtime и standalone monitor.

## Инварианты безопасности

- Старый chat UI и chat runtime не меняют поведение.
- Autonomous stop не останавливает chat run.
- Chat stop не останавливает autonomous session.
- Autonomous errors не append-ятся в активный чат.
- Нет зависимости extension runtime от `python3`.
- Нет обязательной зависимости от Unix shell для API engines.
- CLI engines доступны только если установлен соответствующий binary.
- Все workspace file changes в autonomous mode должны быть явно отражены в session log.

## Критерии готовности issue

- [x] Команда согласна, что `prompt/` — миграционный источник, а не runtime dependency.
- [x] Выбрана целевая структура `src/extension/autonomous`.
- [x] Зафиксированы engine ids и общий direction API/CLI adapters.
- [x] Зафиксировано, что Python/shell orchestration будет удалён.
- [x] Зафиксировано, что UI строится только на shared components.
- [x] Зафиксирован storage root `.aist-agent/autonomous`.
- [x] Добавлен архитектурный README/ADR в коде.
