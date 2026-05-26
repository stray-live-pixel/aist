# 008 — Session store, logs, snapshots и event stream

## Цель

Заменить старые `.agent-auto-logs` и HTML snapshot pipeline нативным session store в TypeScript, пригодным для VS Code UI и будущего standalone/desktop app.

## Где реализовать

```text
src/extension/autonomous/storage/runStorage.ts
src/extension/autonomous/storage/eventLog.ts
src/extension/autonomous/storage/snapshot.ts
src/extension/autonomous/monitoring/sessionMonitor.ts
```

## Storage root

Используем существующий workspace-корень расширения:

```text
.aist-agent/autonomous/sessions/<sessionId>/
```

Почему не `.agents/runs` и не новая `.aist/runs`:

- `.aist-agent` уже существует как workspace-корень настроек AIST;
- `.agents/runs` зарезервирован проектными инструкциями для другого хранилища run artifacts;
- новый `.aist` создал бы второй скрытый каталог с похожим назначением;
- `autonomous/sessions` отделяет runtime артефакты от `.aist-agent/settings.json`.

## Files

```text
meta.json          # atomic write
flow.json          # atomic write, если session kind flow
batch.json         # atomic write, если session kind run
command.json       # launch options / resolved engine / cwd
summary.md         # финальный human-readable summary
raw/               # cli raw streams, stderr, session refs
artifacts/         # future generated exports
events.jsonl       # append-only
```

## Event model

```ts
export type AutonomousEvent = {
  id: string;
  ts: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  action: 'SYS' | 'FLOW' | 'STAGE' | 'STAGE_CTX' | 'ENGINE' | 'TOOL' | 'RESULT' | 'ERROR' | 'DRY' | 'BATCH';
  message: string;
  stageIndex?: number;
  taskIndex?: number;
  data?: Record<string, unknown>;
};
```

## Monitoring state

Presenter читает не raw files напрямую, а service snapshot:

```ts
export type AutonomousSessionView = {
  meta: AutonomousSessionMeta;
  flow?: AutonomousFlowState;
  batch?: AutonomousBatchState;
  eventsTail: AutonomousEvent[];
  diagnostics: AutonomousDiagnostic[];
};
```

## Snapshot/export

Заменить `prompt/src/shared/snapshot.py`:

- `Export session as markdown`;
- `Export session as JSON`;
- optional static HTML export позже.

MVP не обязан генерировать standalone HTML, потому что React dashboard становится основным monitor UI.

## Log tail

- UI получает последние N events, default 300.
- Full log открывается как JSONL/text document.
- Поиск/фильтры могут быть на UI стороне по tail; full search позже.

## Atomicity

- JSON state files: write temp + rename.
- JSONL events: append line.
- Session create: create dir + meta created status.

## Cleanup

- Не удалять sessions автоматически.
- Добавить future action archive/delete session с confirm.
- Stop не удаляет artifacts.

## Tests

- atomic write creates valid json.
- event append order.
- corrupted event line skipped with diagnostic.
- read session view from files.
- export markdown contains key metadata/events.

## Критерии готовности

- Native flow/batch пишет все state в `.aist-agent/autonomous/sessions`.
- UI может показывать session без `.agent-auto-logs`.
- Нет зависимости от `prompt/src/shared/snapshot.py`.
- Store не использует VS Code Memento и пригоден для desktop app.
