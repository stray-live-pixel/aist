# 009 — `apply_patch` tool with preview

## Priority

P1 — высокий profit, высокая сложность.

## Цель

Добавить patch-style edit primitive, чтобы снизить хрупкость больших `replace_in_file` exact replacements.

## Scope

- Добавить tool `apply_patch` с параметрами `reason`, `patch`.
- Поддержать unified diff для workspace files.
- Валидировать пути: только workspace-relative, без binary patches, без выхода за root.
- Использовать existing editable diff preview перед approval.
- Permission default `ask`.
- Возвращать changed files/ranges и structured errors.
- Добавить tests на single-file, multi-file, invalid patch, path traversal, conflict.

## Out of scope

- Semantic `edit_file`.
- Автоматическая генерация patch runtime-ом.

## Acceptance criteria

- Модель может предложить patch и пользователь видит preview до применения.
- Неуспешный patch не оставляет частично изменённый workspace.
- Existing write/replace tools не ломаются.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для patch parser/apply transaction
- ручная проверка approval preview
