# 007 — `outline_file` tool through VS Code symbols

## Priority

P1 — средний/high profit, средняя сложность.

## Цель

Дать модели дешёвый способ понять структуру файла без чтения всего содержимого.

## Scope

- Добавить tool `outline_file` или `list_symbols`.
- Использовать VS Code `vscode.executeDocumentSymbolProvider`.
- Возвращать name, kind, line, endLine, children для символов.
- Ограничить глубину/количество symbols.
- Default permission `auto`.
- Добавить fallback result, если language server не вернул symbols.
- Добавить tests/mocks для symbol provider.

## Out of scope

- Repo-wide symbol index.
- LSP-specific integrations.

## Acceptance criteria

- Tool работает для TypeScript/React файлов при доступных symbols.
- При отсутствии symbols возвращается понятный `ok: false` или empty outline без падения loop.
- Tool виден модели и имеет обязательный `reason`.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests с mocked VS Code command
