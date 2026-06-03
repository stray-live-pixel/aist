# Задача 06: заменить частые полные rebuild индекса точечными обновлениями

## Зависимость

Выполнять после задачи 05.

## Проблема

Даже после удаления `rebuildChatIndex` из hot state updates останутся операции, которые всё ещё пересобирают индекс всех чатов:

- добавление сообщения;
- обновление metadata;
- setHistory;
- updateMessage;
- clear;
- create/delete.

Часть из них действительно влияет на список, но полная пересборка через чтение всех чатов слишком дорогая.

## Главная цель

Там, где изменился один чат, обновлять summary этого чата в `index.json` точечно, а полный `rebuildChatIndex` оставить только как fallback recovery.

## Область изменений

Основные файлы:

- `src/core/entities/chat/chatRepository/rebuildChatIndex.ts`
- `src/core/entities/chat/chatRepository/readUsableChatIndex.ts`
- `src/core/entities/chat/chatRepository/updateChatIndexAfterCreate.ts`
- создать новый файл `src/core/entities/chat/chatRepository/upsertChatIndexSummary.ts`
- создать новый файл `src/core/entities/chat/chatRepository/removeChatIndexSummary.ts`, если нужно
- `src/core/entities/chat/chatRepository/appendChatMessage.ts`
- `src/core/entities/chat/chatRepository/updateChatMetadata.ts`
- `src/core/entities/chat/chatRepository/deleteChat.ts`
- `src/core/entities/chat/chatRepository/clearChat.ts`

## Детерминированный план реализации

1. Прочитать текущий `StoredChatIndex` и helper `toSummary`.
2. Создать функцию `upsertChatIndexSummary({ context, chat })` в отдельном файле.
3. Функция должна:
   - прочитать текущий index через `readUsableChatIndex`;
   - если index отсутствует или повреждён, вызвать `rebuildChatIndex`;
   - заменить summary одного чата или добавить его;
   - отсортировать summaries через `sortSummaries`;
   - записать index через `writeJsonAtomic`.
4. Создать функцию `removeChatIndexSummary({ context, chatId })` для delete:
   - если index отсутствует, вызвать rebuild или ничего не делать по выбранной безопасной стратегии;
   - удалить summary chatId;
   - записать index.
5. Заменить полные rebuild в сценариях, где известен изменённый чат, на `upsertChatIndexSummary`.
6. Оставить `rebuildChatIndex` для:
   - recovery повреждённого index;
   - explicit `ChatRepository.rebuildIndex()`;
   - случаев, где изменение реально затрагивает много чатов.
7. Не менять формат `index.json`.
8. Добавить тесты на create/update/delete/list после точечных изменений.

## Тесты

Regression-тесты:

1. Создать 3 чата.
2. Добавить сообщение во второй чат.
3. Проверить, что summaries отсортированы корректно.
4. Проверить, что остальные чаты не перечитываются полностью, если возможно через spy/harness.
5. Удалить чат и проверить, что summary удалён.
6. Повредить index и проверить, что fallback rebuild всё ещё работает.

Команды:

```bash
npm test -- --run src/core/entities/chat/chatRepository.test.ts
npm run typecheck
```

## Критерии приёмки

- Изменение одного чата обновляет один summary, а не пересобирает все чаты.
- Повреждённый index всё ещё восстанавливается.
- `chat.list` остаётся корректным.
- Формат storage не меняется.

## Что не делать в этой задаче

- Не менять runtime events.
- Не менять extension bridge.
- Не вводить in-memory cache как отдельный источник правды.
