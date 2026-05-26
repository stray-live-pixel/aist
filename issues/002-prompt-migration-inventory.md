# 002 — Миграционная инвентаризация prompt и parity matrix

## Цель

Составить полный список возможностей `prompt/`, которые должны быть перенесены в TypeScript/Node. Этот issue защищает от ситуации, когда UI появился, но важное поведение старого runner потерялось.

## Что инвентаризировать

### CLI/API surface старого runner

Из `prompt/agent-auto.sh`:

- direct prompt mode;
- `--engine claude|codex`;
- `--ui` terminal monitor;
- `--html` browser monitor;
- `--flow <name>`;
- `--run <name>`;
- `--cwd <dir>`;
- `--dry-run`;
- `--log-dir`;
- `--log-file`;
- `--port`;
- env vars `AGENT_AUTO_*` и legacy `CLAUDE_AUTO_*`.

### Flow behavior

Из `prompt/src/run_flow.py` и `prompt/flows/README.md`:

- `.index.md` metadata;
- ordered `stages`;
- per-stage frontmatter;
- `model`, `codex_model` resolution;
- `contexts`:
  - standalone;
  - `continue`;
  - `continue-from`;
  - `summary-from`;
- `default_summary_rules` cascade;
- extra prompt prepend;
- `flow.json` pipeline state;
- stage info snapshots;
- dry-run synthetic events.

### Batch behavior

Из `prompt/src/run_batch.py` и `prompt/runs/README.md`:

- `.index.md` с `dir`, `repeat`, `tasks`;
- task-level `repeat`;
- outer repeat;
- issue body as extra prompt;
- moving `issues/**` → `done/**` only after final successful outer iteration;
- failure handling and unresolved summary.

### Engine behavior

- Claude Code CLI:
  - bypass permissions flags;
  - stream-json parse;
  - session id capture;
  - session file path `~/.claude/projects/...`;
  - fork by copying `.jsonl`.
- Codex CLI:
  - `codex exec --json`;
  - bypass sandbox flags;
  - session discovery in `~/.codex/sessions`;
  - fork by rewriting session meta id.
- API engines target:
  - OpenRouter via existing `OpenRouterClient`;
  - Codex API via existing `CodexClient`.

### Monitoring/logging

- `log.txt` human format;
- `log.jsonl` structured events;
- `status.json`;
- `ctx.json`;
- `flow.json`;
- `command.txt`;
- `view.html` snapshot;
- action categories: ASSISTANT, DONE, STAGE, STAGE_CTX, FLOW, WRITE, RESULT, ERROR, SYS, DRY, BASH, EVENT, THINKING.

### UI behavior

Из `prompt/src/shared/ui/*`:

- session header;
- status;
- command card;
- pipeline tabs;
- stage duration;
- log search/filter/view modes;
- context chart/modal;
- copy buttons;
- snapshot read-only mode.

## Deliverable

Создать документ:

```text
issues/prompt-parity-matrix.md
```

Структура:

| Capability | Old source | Target TS module | MVP/Phase 2 | Notes |
| ---------- | ---------- | ---------------- | ----------- | ----- |

## Решения, которые нужно принять

- Нужно ли сохранять exact old file format `.agent-auto-logs`, или можно новый `.aist-agent/autonomous/sessions` с мигратором?
- Нужен ли direct prompt mode в MVP или только flow/run?
- Поддерживать ли terminal monitor, если VS Code UI заменяет его?
- Нужен ли HTML snapshot как standalone artifact или достаточно React/session export?
- Что делать с `--log-file`: сохранять как compatibility option или убрать?

## Критерии готовности

- Все файлы `prompt/src/**` сопоставлены с будущим TS модулем или помечены deprecated.
- Для каждого флага `agent-auto.sh` есть решение: перенести, заменить, deprecated.
- Для каждого UI behavior есть React/shared UI replacement или explicit deprecation.
- Есть список behavior tests, которые должны пройти перед удалением `prompt/`.
