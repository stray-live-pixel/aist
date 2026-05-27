# 002 — `read_file_range` tool

## Priority

P0 — высокий profit, низкая/средняя сложность.

## Цель

Добавить tool для чтения диапазона строк, чтобы модель не читала большие файлы целиком после `grep_search`.

## Scope

- Добавить `read_file_range` в `src/extension/tools/filesystemTools.ts`.
- Параметры: `reason`, `path`, `startLine`, `endLine`.
- Ограничить диапазон, например максимум 400 строк за вызов.
- Вернуть `ok`, `path`, `startLine`, `endLine`, `totalLines`, `content`, `truncatedRange`.
- Добавить permission default `auto` в `src/extension/tools/permissions.ts`.
- Обновить tool descriptions так, чтобы `read_file` рекомендовал `read_file_range` для известных диапазонов.
- Добавить unit tests для clamping, invalid ranges, missing file и больших диапазонов.

## Out of scope

- Symbol outline.
- Tool result compression.

## Acceptance criteria

- Модель видит новый tool в списке tools.
- Tool безопасно ограничивает диапазон и не выходит за workspace.
- `read_file` продолжает работать как раньше.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для filesystem tools
