# 010 — Prompt contract snapshots

## Priority

P1 — средний profit, низкая сложность, важная страховка.

## Цель

Зафиксировать expected prompt contracts, чтобы дальнейшие оптимизации не удаляли ключевые правила и не раздували prompt незаметно.

## Scope

- Добавить tests/snapshots для base prompt EN/RU.
- Добавить snapshots для prompt со skills и project instructions.
- Проверять наличие invariants: language, workspace-relative paths, concrete reason, shell policy, approval-aware edits, no fake results.
- Добавить budget assertion по длине base prompt.
- Обновить test docs.

## Out of scope

- Runtime prompt A/B testing.
- Telemetry.

## Acceptance criteria

- Snapshot tests падают при удалении обязательных правил.
- Есть понятный способ обновить snapshots при осознанной правке prompt.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- `npm test -- --run` или актуальная unit test команда проекта
