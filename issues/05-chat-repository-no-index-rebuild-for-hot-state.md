# Задача 05: убрать `rebuildChatIndex` из горячих state updates

## Зависимость

Выполнять после задач 01–04.

## Проблема

`updateChatState` вызывается на горячем пути агента:

- `busy`;
- `activity`;
- `activityDetail`;
- `modelRequest`;
- `context`;
- `activePlan`.

Сейчас `updateChatState` после каждой записи state вызывает `rebuildChatIndex`.

Файл:

- `src/core/entities/chat/chatRepository/updateChatState.ts`

`rebuildChatIndex` читает все чаты полностью, включая messages/history:

- `src/core/entities/chat/chatRepository/rebuildChatIndex.ts`
- `src/core/entities/chat/chatRepository/readChatFromMeta.ts`

При streaming двух агентов это создаёт много лишних файловых операций.

## Главная цель

Горячие transient-state изменения не должны пересобирать индекс всех чатов.

## Область изменений

Основные файлы:

- `src/core/entities/chat/chatRepository/updateChatState.ts`
- `src/core/entities/chat/chatRepository/touchChatMeta.ts`
- `src/core/entities/chat/chatRepository/rebuildChatIndex.ts`
- `src/core/entities/chat/chatRepository/listChats.ts`
- `src/core/entities/chat/chatRepository.test.ts`
- `src/core/entities/chat/chatRepository.testParts/*`

## Детерминированный план реализации

1. Прочитать `updateChatState.ts` и список методов `ChatRepository`, которые через него идут.
2. Разделить state updates на две категории:
   - hot transient updates: `activity`, `activityDetail`, `modelRequest`, `busy`, `activePlan`;
   - summary-relevant updates: то, что реально должно менять список чатов или сортировку.
3. Для hot transient updates убрать `rebuildChatIndex`.
4. Сохранить запись `state.json`, чтобы refresh конкретного чата видел актуальное состояние.
5. Решить, нужно ли `touchChatMeta` для hot updates:
   - если `updatedAt` в списке чатов не должен прыгать на каждый progress tick, не трогать meta;
   - если нужен индикатор активности в sidebar, обновлять meta точечно без полного rebuild.
6. Самое простое безопасное изменение:
   - `updateChatState` пишет только `state.json` и возвращает `requireChat`;
   - `rebuildChatIndex` убрать из этого метода.
7. Проверить, что create/delete/message append/model change всё ещё обновляют индекс.
8. Добавить тест, что `setActivityDetail` не вызывает пересборку индекса или не меняет index updatedAt.

## Тесты

Regression-тесты:

1. Создать два чата.
2. Запомнить `index.json` или summaries.
3. Вызвать `setActivityDetail` у одного чата.
4. Проверить, что:
   - сам чат при `get(chatId)` содержит новый `activityDetail`;
   - список чатов остаётся валидным;
   - index не был полностью перестроен, если это можно проверить стабильно.

Если напрямую проверить отсутствие rebuild трудно, добавить spy/harness на сценарную функцию или проверить неизменность `index.updatedAt` при controlled `now()`.

Команды:

```bash
npm test -- --run src/core/entities/chat/chatRepository.test.ts
npm run typecheck
```

## Критерии приёмки

- Hot state updates больше не читают все чаты.
- `chat.get` после hot update возвращает актуальный state.
- `chat.list` продолжает работать.
- Create/delete/message append продолжают корректно обновлять список.

## Что не делать в этой задаче

- Не делать сложный новый индекс.
- Не менять формат хранения чатов.
- Не менять daemon или extension очереди.
