# 020 — Opt-in cloud memory sync

## Priority

P4 — высокий strategic value для multi-device, но самая высокая сложность и privacy risk; делать последней.

## Цель

Синхронизировать выбранные memory items между машинами пользователя через облачный сервер без отправки raw chats/tool outputs.

## Scope

- Спроектировать backend API: pull, batch upsert, delete, audit.
- Добавить auth и opt-in UI.
- Синхронизировать только memory items с `sync: true`.
- Project memory по умолчанию local-only; sync только в private namespace.
- Добавить privacy labels: public/private/sensitive/local-only.
- Рассмотреть E2E encryption ключом пользователя.
- Реализовать conflict resolution и audit log.
- Добавить export/delete account data flow.

## Out of scope

- Sync raw chats/tool outputs.
- Sync declarative tools/instructions до отдельного privacy review.

## Acceptance criteria

- Cloud sync выключен по умолчанию.
- Пользователь явно выбирает, какие заметки синхронизировать.
- Raw prompts, chats, tool outputs, secrets не отправляются.
- Есть delete/export механизмы.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- backend/client integration tests
- privacy checklist review
