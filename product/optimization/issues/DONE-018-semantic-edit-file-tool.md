# 018 — Semantic `edit_file` tool

## Priority

P3 — высокий profit, очень высокая сложность.

## Цель

Добавить semantic edit abstraction, где модель описывает намерение и ожидаемое изменение, а runtime выбирает безопасный edit primitive и preview.

## Scope

- Добавить tool `edit_file` с `reason`, `path`, `strategy`, `instructions`, `expectedChange`.
- Runtime читает текущий файл, выбирает exact replace / patch / rewrite small file.
- Для больших файлов запрещать full rewrite без explicit approval warning.
- Всегда показывать preview.
- Возвращать changed ranges, strategy used, diagnostics.
- Добавить tests на strategy selection и rollback.

## Out of scope

- LLM-based edit generation внутри runtime.
- Multi-file semantic edit.

## Acceptance criteria

- Модель может запросить semantic edit без огромных `search`/`replace` args.
- Runtime не применяет изменения без preview/approval.
- При ошибке workspace остаётся консистентным.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для strategy selector
- ручная проверка small/large file edits
