# 003 — Compaction with `keepLastMessages`

## Priority

P0 — высокий profit, низкая сложность.

## Цель

Сделать настройку `keepLastMessages` реально работающей, чтобы compaction не терял свежий контекст.

## Scope

- Обновить compaction flow в `AgentController.compactChat()` / `ChatStore.compactChat()`.
- Summary строить по старой истории без последних N сообщений, если N > 0.
- Новый compacted chat должен содержать summary + tail последних N сообщений.
- Сохранить связь `previousChatId` и usage/context semantics.
- Обновить compaction prompt на структурированный output: Goal, Status, Constraints, Decisions, Files changed, Commands run, Open tasks, Errors/blockers.
- Добавить tests на `keepLastMessages = 0`, `1`, `N > history.length`.

## Out of scope

- Tool result compression.
- Memory-aware summaries.

## Acceptance criteria

- Настройка `keepLastMessages` влияет на новую compacted history/messages.
- Summary остаётся первым handoff-сообщением.
- Последние сообщения сохраняются в исходном порядке.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для ChatStore/compaction
