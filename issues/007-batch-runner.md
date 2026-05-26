# 007 — Node batch runner для run-пакетов задач

## Цель

Заменить `prompt/src/run_batch.py` TypeScript реализацией, которая запускает run packages через native flow orchestrator.

## Где реализовать

```text
src/extension/autonomous/batch/runBatch.ts
src/extension/autonomous/batch/taskMover.ts
src/extension/autonomous/batch/runBatch.test.ts
```

## Required behavior parity

Из старого `run_batch.py`:

- читать run `.index.md`;
- `dir:` required;
- `repeat:` run-level;
- `tasks:` ordered;
- task-level `repeat`;
- task body передаётся как extra prompt в flow;
- outer loop;
- task moved `issues/` → `done/` только после последней outer iteration и успешных inner repeats;
- failed tasks остаются pending;
- path traversal protection;
- flow existence validation.

## Target behavior

Batch runner вызывает TS flow orchestrator напрямую:

```ts
await flowOrchestrator.runFlow({
  flowId: task.flowId,
  workDir: run.workDir,
  extraPrompt: task.body,
  engineId,
  dryRun,
  parentSessionId: batchSession.id
});
```

Никакого shell launcher.

## Runtime state

```ts
export type AutonomousBatchState = {
  runId: string;
  title: string;
  status: 'running' | 'done' | 'error' | 'stopped';
  outerCurrent: number;
  outerTotal: number;
  tasks: AutonomousBatchTaskState[];
  startedAt: string;
  finishedAt?: string;
};
```

Task state:

- pending/running/done/failed/skipped;
- current inner repeat;
- attempts;
- linked child flow session ids;
- final moved path.

## File moving

- Preserve subdirectories inside `issues/`.
- If destination exists, dedupe suffix like old runner.
- Never move file on partial failure.
- Use atomic-ish operation with VS Code fs or Node fs; document choice.

## Stop behavior

- Stop batch aborts current flow session.
- Already moved tasks remain in done.
- Current failed/stopped task stays in issues.
- Batch state `stopped`.

## UI implications

Dashboard run session shows:

- batch progress outer/inner;
- current task;
- child flow progress;
- failed tasks list;
- moved done path.

## Нельзя делать

- Не вызывать `agent-auto.sh --run`.
- Не использовать Python.
- Не блокировать extension host синхронными long loops без awaits.

## Тесты

- repeat math exactly as README.
- successful final outer moves task.
- failure does not move task.
- next outer retries failed task.
- path traversal rejected.
- stop aborts current flow.

## Критерии готовности

- `benefits-list-analysis` dry-run можно выполнить native runner-ом.
- Moving issues→done matches old semantics.
- Batch events видны в session log.
