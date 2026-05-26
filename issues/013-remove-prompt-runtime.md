# 013 — Удаление shell/python зависимости и deprecation prompt/

## Цель

После достижения parity удалить runtime-зависимость от `prompt/` и подготовить удаление самой папки `prompt/`.

## Preconditions

Перед началом этого issue должны быть готовы:

- parity matrix из issue 002;
- native discovery/import;
- native flow orchestrator;
- native batch runner;
- engines CLI/API;
- native session store;
- React dashboard;
- tests на ключевые flows/runs.

## Что удалить/заменить

Legacy runtime:

- `prompt/agent-auto.sh`;
- `prompt/src/run_flow.py`;
- `prompt/src/run_batch.py`;
- `prompt/src/parse_agent_stream.py`;
- `prompt/src/server.py`;
- `prompt/src/shared/*.sh`;
- `prompt/src/shared/*.py`;
- `prompt/src/agents/**` Python/shell adapters;
- `prompt/src/shared/ui/*` standalone monitor.

Definitions:

- `prompt/flows/**` → imported/copied to `.aist-agent/autonomous/flows/**` or packaged templates;
- `prompt/runs/**` → user/workspace-specific migration decision.

## Migration command

Add command/action:

```text
aist: Import Legacy Prompt Runner Definitions
```

It should:

1. Read `prompt/flows` and `prompt/runs`.
2. Copy definitions to `.aist-agent/autonomous`.
3. Not copy logs/runtime scripts.
4. Report conflicts.
5. Produce migration summary.

## Deprecation phases

### Phase A — dual read

- UI reads both `prompt/` and `.aist-agent/`.
- Legacy marked as deprecated.
- Start works from imported native definitions; direct start from legacy may be disabled or auto-import.

### Phase B — native only default

- New definitions created only in `.aist-agent/`.
- Legacy prompt hidden behind `Show legacy`.

### Phase C — remove prompt

- Remove `prompt/` from repository.
- Keep docs for migrating external users.

## Checks before deletion

- No imports/references to `prompt/src`.
- No code path invokes `python3` for autonomous runner.
- No code path invokes `agent-auto.sh`.
- Tests use TS fixtures, not old runtime scripts.
- Docs updated.

## Критерии готовности

- `grep` по `agent-auto.sh`, `run_flow.py`, `run_batch.py`, `prompt/src` не находит runtime references outside docs/migration notes.
- Native runner can execute migrated example flow dry-run.
- Native runner can execute migrated benefits-list run dry-run.
- `prompt/` can be deleted in a follow-up commit without breaking build/test.
