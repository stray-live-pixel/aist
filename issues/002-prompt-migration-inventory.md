# 002 — Миграционная инвентаризация prompt и parity matrix

## Статус

DONE — parity matrix зафиксирована в [`issues/prompt-parity-matrix.md`](./prompt-parity-matrix.md).

## Выполнено

- [x] Сопоставлен CLI/API surface старого `prompt/agent-auto.sh`.
- [x] Сопоставлено flow behavior из `prompt/src/run_flow.py` и `prompt/flows/README.md`.
- [x] Сопоставлено batch behavior из `prompt/src/run_batch.py` и `prompt/runs/README.md`.
- [x] Сопоставлены Claude/Codex CLI adapters и целевые API engines.
- [x] Сопоставлены monitoring/logging artifacts.
- [x] Сопоставлено standalone UI behavior с React/shared UI replacements.
- [x] Приняты решения по `.agent-auto-logs`, direct mode, terminal monitor, HTML snapshot и `--log-file`.
- [x] Зафиксирован список behavior tests перед удалением `prompt/`.
