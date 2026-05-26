# Native autonomous runner architecture

## Статус

Планируемый домен. Этот каталог резервирует целевую архитектуру перед переносом `prompt/` в TypeScript/Node.

## Решение

`prompt/` считается миграционным источником форматов и поведения, а не runtime-зависимостью расширения. Shell/Python orchestration (`agent-auto.sh`, `run_flow.py`, `run_batch.py`, `server.py`) должен быть заменён нативными TypeScript/Node модулями внутри AIST.

## Цели домена

- Исполнять multi-stage flows и batch runs без `python3` и shell launcher.
- Поддерживать engines `claude-cli`, `codex-cli`, `openrouter-api`, `codex-api` через единый interface.
- Переиспользовать существующие `OpenRouterClient` и `CodexClient` как API adapters.
- Хранить definitions, sessions, events и artifacts в workspace-native каталоге `.aist-agent/autonomous/`.
- Отдавать состояние в React webview через typed IPC и presenter.
- Оставаться пригодным для будущего desktop/standalone приложения: core orchestration не должен зависеть от VS Code API.

## Целевая раскладка

```text
src/extension/autonomous/
├── controller.ts
├── discovery.ts
├── frontmatter.ts
├── engines/
│   ├── types.ts
│   ├── claudeCliEngine.ts
│   ├── codexCliEngine.ts
│   ├── openRouterEngine.ts
│   └── codexApiEngine.ts
├── flow/
│   ├── orchestrator.ts
│   ├── contextResolver.ts
│   └── promptBuilder.ts
├── batch/
│   └── runBatch.ts
├── storage/
│   ├── runStorage.ts
│   └── eventLog.ts
├── presenter.ts
├── messages.ts
├── types.ts
└── errors.ts
```

## Workspace storage

Используем существующий корень расширения `.aist-agent`, а не новый `.aist`, чтобы не плодить два скрытых каталога AIST в workspace:

```text
.aist-agent/
├── settings.json
└── autonomous/
    ├── flows/<flowId>/.index.md
    ├── runs/<runId>/.index.md
    └── sessions/<sessionId>/
        ├── meta.json
        ├── events.jsonl
        ├── flow.json
        ├── batch.json
        ├── command.json
        ├── summary.md
        ├── raw/
        └── artifacts/
```

`settings.json` остаётся в ведении существующего agent config store. Все autonomous filesystem operations должны быть сосредоточены в будущем `storage/` и `discovery.ts`, а не размазаны по controller/UI.

## Отношение к текущему chat agent

- `AgentController`, `AgentRunService` и `ChatStore` не становятся частью autonomous runtime.
- Chat stop и autonomous stop — разные команды и разные lifecycle.
- Ошибки autonomous runner не append-ятся в активный чат.
- Chat webview state не должен зависеть от discovery или active autonomous sessions.
- Общие API-клиенты и низкоуровневые утилиты можно переиспользовать через adapters, но не через chat-specific controller.

## UI-правило

Autonomous dashboard строится на `src/webview/shared/ui`. Если нужен новый визуальный primitive, сначала добавляется или дорабатывается shared component со story, и только потом он используется на странице autonomous UI.

## Migration outline

1. Составить parity matrix по `prompt/`.
2. Реализовать TypeScript discovery и import legacy definitions в `.aist-agent/autonomous/`.
3. Реализовать engine abstraction для CLI/API engines.
4. Перенести flow orchestrator.
5. Перенести batch runner.
6. Реализовать native session store и event stream.
7. Добавить React dashboard.
8. Удалить shell/python runtime после прохождения parity и regression checks.
