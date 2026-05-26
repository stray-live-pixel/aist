# 003 — Модели данных flow/run/session и формат хранения

## Цель

Определить TypeScript-модели и workspace-native хранение autonomous runner, которое заменит `prompt/flows`, `prompt/runs` и `.agent-auto-logs` как runtime source of truth.

## Целевая структура хранения

Используем существующий workspace-корень расширения `.aist-agent`, а не вводим новый `.aist`:

```text
.aist-agent/
├── settings.json
└── autonomous/
    ├── flows/<flowId>/.index.md
    ├── flows/<flowId>/<stage>.md
    ├── runs/<runId>/.index.md
    ├── runs/<runId>/issues/**/*.md
    ├── runs/<runId>/done/**/*.md
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

Почему `.aist-agent/`, а не `globalStorage` или новая `.aist/`:

- `.aist-agent/settings.json` уже используется расширением для workspace-настроек;
- autonomous tasks относятся к workspace;
- артефакты должны коммититься/ревьюиться вместе с кодом при необходимости;
- будущий desktop app сможет открыть проект без VS Code globalStorage;
- один скрытый корень AIST проще документировать, мигрировать и удалять.

## Модели definitions

```ts
export type AutonomousFlowDefinition = {
  id: string;
  title: string;
  description: string;
  defaultModel?: string;
  defaultCodexModel?: string;
  defaultSummaryRules?: string;
  stages: AutonomousStageDefinition[];
  sourcePath: string;
};

export type AutonomousStageDefinition = {
  index: number;
  file: string;
  title: string;
  body: string;
  model?: string;
  codexModel?: string;
  contexts: AutonomousStageContext[];
  summaryRules?: string;
};

export type AutonomousStageContext =
  | { mode: 'continue'; from?: number }
  | { mode: 'continue-from'; from: number }
  | { mode: 'summary-from'; from: number; summaryRules?: string };
```

```ts
export type AutonomousRunDefinition = {
  id: string;
  title: string;
  workDir: string;
  repeat: number;
  tasks: AutonomousRunTaskDefinition[];
  sourcePath: string;
};

export type AutonomousRunTaskDefinition = {
  index: number;
  taskPath: string;
  flowId: string;
  repeat: number;
  body: string;
};
```

## Session models

```ts
export type AutonomousSessionMeta = {
  id: string;
  kind: 'flow' | 'run' | 'direct';
  targetId?: string;
  status: 'created' | 'running' | 'paused' | 'finished' | 'stopped' | 'error';
  engineId: AutonomousEngineId;
  workspaceRoot: string;
  workDir: string;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number;
  error?: string;
};
```

## Event log

Заменить `log.txt/log.jsonl` единым append-only `events.jsonl`:

```ts
export type AutonomousEvent = {
  id: string;
  ts: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  action: string;
  message: string;
  stageIndex?: number;
  data?: Record<string, unknown>;
};
```

Human-readable log можно генерировать из events при export, а не хранить как primary source.

## Atomic writes

- `meta.json`, `flow.json`, `batch.json`, `command.json` — temp file + rename.
- `events.jsonl` — append-only.
- Большие engine raw logs — отдельные artifact files, не в state message.

## Migration compatibility

На время миграции discovery должен уметь читать:

- legacy `prompt/flows`;
- legacy `prompt/runs`;
- native `.aist-agent/autonomous/flows`;
- native `.aist-agent/autonomous/runs`.

UI должен показывать source label: `legacy prompt` или `native .aist-agent`.

## Критерии готовности

- Типы definitions/sessions/events созданы.
- Storage API изолирует filesystem details.
- Storage root зафиксирован как `.aist-agent/autonomous`.
- Legacy prompt можно импортировать/читать без запуска Python.
- Хранение подходит для будущего desktop app без VS Code-specific Memento.
