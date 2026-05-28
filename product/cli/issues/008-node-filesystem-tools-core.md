# 008 — Node filesystem tools core

## Priority

P1 — required for CLI agent actions, high complexity.

## Goal

Создать Node-safe реализацию core filesystem tools для CLI: чтение, поиск, bash, запись, replace, apply_patch, directories и delete без VS Code API.

## Context

`filesystemTools.ts` зависит от `vscode.workspace.fs`, `findFiles`, diff preview и document symbols. CLI не сможет использовать эти tools напрямую. Нужно разделить pure Node execution и VS Code-assisted capabilities.

## Scope

- Создать core/node `tool definitions` для:
  - `get_workspace_info`;
  - `list_files`;
  - `read_file`;
  - `read_file_range`;
  - `grep_search`;
  - `run_bash_script`;
  - `write_file`;
  - `replace_in_file`;
  - `apply_patch`;
  - `create_directory`;
  - `delete_path`.
- Переиспользовать `applyPatch.ts`, `semanticEdit.ts` где возможно.
- Реализовать Node workspace guard и стандартные ignores.
- Оставить `outline_file` как optional VS Code capability или CLI fallback `unsupported` с понятным result.
- Не включать `edit_file` preview в auto-apply здесь; она будет через approval/preview issue.
- Добавить tests без mocked VS Code.

## Out of scope

- VS Code editable diff preview.
- Project tools registry перенос.
- CLI command surface.

## Implementation notes

- `run_bash_script` должен использовать `spawn('bash', ['-lc', script])` с cwd внутри workspace и timeout.
- `grep_search` должен ограничивать размер файлов и поддерживать `filesOnly/countOnly/context/exclude` как extension tool.
- `delete_path` в CLI не должен использовать trash, если нет cross-platform зависимости; описать отличие и сделать безопасный approval default.
- Ошибки возвращать в structured format через `toStructuredToolFailure`.

## Acceptance criteria

- Node tools проходят focused tests на реальные temp directories.
- Tool schemas остаются совместимыми с текущими model-visible tools.
- Extension tools продолжают работать; можно переиспользовать Node core или оставить adapter wrapper.
- Нет VS Code imports в Node tools core.

## Suggested verification

- `npm run typecheck`
- Focused unit tests для Node filesystem tools
- Manual temp workspace smoke через test helper
