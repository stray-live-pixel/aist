# 019 — Tool-use telemetry dashboard

## Priority

P3 — средний profit, высокая сложность.

## Цель

Сделать оптимизации prompt/tools измеримыми через локальную телеметрию run-ов.

## Scope

- Собирать per-run metrics: prompt/completion tokens, tool calls by type, first edit latency, failed edits, repeated tool calls, approvals, context bytes.
- Хранить локально в `.aist-agent/telemetry` или extension storage без cloud.
- Добавить presenter state и UI dashboard/settings page.
- Добавить export JSON/Markdown.
- Не логировать raw prompts, raw tool outputs и secrets.
- Добавить tests на metrics aggregation.

## Out of scope

- Remote analytics.
- A/B automation.

## Acceptance criteria

- Пользователь видит последние run metrics и агрегаты.
- Metrics помогают сравнить до/после prompt/tool changes.
- Privacy-sensitive raw data не сохраняется.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для aggregation
- ручная проверка dashboard после нескольких runs
