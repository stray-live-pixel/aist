# 011 — Tool result dual-channel

## Priority

P1/P2 — высокий profit, высокая сложность.

## Цель

Хранить полный tool output для UI, но отправлять модели сжатую версию в history, чтобы уменьшить context bloat.

## Scope

- Разделить `ChatMessage.result` и model-facing tool result content.
- Для `read_file`, `grep_search`, `run_bash_script`, diff preview добавить compact result builders.
- Сохранять полный output в UI/state как раньше.
- В model history отправлять summary/top matches/error metadata/artifact marker.
- Добавить лимиты и tests на большие stdout/read_file outputs.
- Убедиться, что compaction получает model-facing summaries, а не raw dumps.

## Out of scope

- Persisted artifact store.
- Cloud sync.

## Acceptance criteria

- UI показывает полный tool result.
- Следующий model request получает сокращённый tool result при больших outputs.
- Малые outputs не теряют полезную информацию.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для compact result builders
- ручная проверка большого `run_bash_script`
