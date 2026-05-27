# 008 — Structured tool errors

## Priority

P1 — средний profit, низкая/средняя сложность.

## Цель

Возвращать машинно-понятные error codes из tools, чтобы модель лучше восстанавливалась после неудачных вызовов.

## Scope

- Ввести общий формат `{ ok: false, code, error, details? }` для filesystem/custom tool failures.
- Покрыть основные коды: `TEXT_NOT_FOUND`, `PATH_OUTSIDE_WORKSPACE`, `FILE_NOT_FOUND`, `NOT_A_DIRECTORY`, `TIMEOUT`, `INVALID_ARGUMENT`.
- Обновить `handleAgentToolCall`, чтобы не терять code при catch.
- Обновить prompt/tool descriptions: при `TEXT_NOT_FOUND` перечитать диапазон перед повтором.
- Добавить tests для ключевых tools.

## Out of scope

- Full retry policy.
- Telemetry dashboard.

## Acceptance criteria

- Ошибки tools содержат стабильный `code` там, где это возможно.
- UI продолжает показывать человекочитаемый текст ошибки.
- Модель получает structured result в history.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для error mapping
