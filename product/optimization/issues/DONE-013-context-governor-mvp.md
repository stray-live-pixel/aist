# 013 — ContextGovernor MVP

## Priority

P2 — высокий profit, высокая сложность.

## Цель

Добавить слой управления контекстом перед model request, чтобы отправлять модели только релевантные части editor/history/tool context.

## Scope

- Создать `ContextGovernor` для классификации задачи и выбора context pack.
- MVP classification rule-based: read-only, code-edit, debug/test-fix, repo-inspection.
- Учитывать `editorContextMode`, active selection, active file metadata, recent tool summaries.
- Добавлять короткий `Context note` в user content или system-adjacent block.
- Ограничивать budget на editor context и history tail.
- Добавить tests на основные task types.

## Out of scope

- LLM classifier.
- Memory retrieval.
- Repo map deep integration.

## Acceptance criteria

- Нерелевантный active file не попадает целиком в prompt по умолчанию.
- Selection приоритетно включается для edit задач.
- Prompt содержит объяснимый context note.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для ContextGovernor
- ручная проверка разных ask сценариев
