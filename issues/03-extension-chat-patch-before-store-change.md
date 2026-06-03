# Задача 03: гарантировать incremental `chat.patch` до full state broadcast

## Зависимость

Выполнять после задач 01 и 02.

## Проблема

Сейчас bridge сначала refresh-ит store, а потом уведомляет controller о daemon event.

Цепочка:

1. daemon event приходит в client;
2. `queueBridgeRefresh` вызывает `refreshBridgeChat`;
3. `refreshBridgeChat` вызывает `context.chats.upsert(result.chat)`;
4. `upsert` сразу вызывает `changedEmitter.fire()`;
5. `handleChatStoreChange` через microtask может отправить полный state;
6. только после этого bridge вызывает `notifyBridgeEventListeners`, а controller делает `postChatPatch`.

Из-за этого оптимизация incremental patch может срабатывать слишком поздно.

## Главная цель

Для daemon events, которые можно представить как `chat.patch`, webview должен получать patch без лишнего full state broadcast.

## Область изменений

Основные файлы:

- `src/extension/agent/daemon/bridge/queueBridgeRefresh.ts`
- `src/extension/agent/daemon/bridge/notifyBridgeEventListeners.ts`
- `src/extension/agent/daemon/bridge/refreshBridgeChat.ts`
- `src/extension/agent/daemon/chatStore/upsertChat.ts`
- `src/extension/agent/agentController/postChatPatch.ts`
- `src/extension/agent/agentController/handleChatStoreChange.ts`
- `src/extension/agent/webview/mapDaemonEventToChatPatch.ts`

Тесты:

- `src/extension/agent/agentController/postChatPatch.test.ts`
- `src/extension/agent/agentController/postChatPatch.ts`
- добавить новый focused-тест на порядок событий, если текущих тестов недостаточно.

## Детерминированный план реализации

1. Прочитать текущий порядок в `queueBridgeRefresh`.
2. Найти, где именно вызывается `notifyBridgeEventListeners`.
3. Сделать так, чтобы controller мог выставить suppression до `changedEmitter.fire()` от daemon refresh.
4. Предпочтительный простой вариант:
   - перед refresh store вызвать listeners для patch-события;
   - затем выполнить `refreshBridgeChat`;
   - performance telemetry можно записывать после refresh.
5. Если ранний вызов listeners ломает контракт «listener после refresh store», ввести отдельный callback/событие `beforeStoreRefresh` только для patch suppression.
6. Не допускать двойной отправки patch.
7. Проверить, что `suppressedChatStoreStateBroadcasts` увеличивается до `upsert` и уменьшается в `handleChatStoreChange`.
8. Убедиться, что события без patch не подавляют full state.

## Важное ограничение

Не надо полностью переписывать `AgentController`. Цель — исправить порядок hot path, а не менять архитектуру.

## Тесты

Добавить regression-тест на порядок:

1. Создать fake store с `onDidChange`.
2. Создать fake surface с `postMessage`.
3. Смоделировать daemon event, который мапится в patch.
4. Проверить, что:
   - `postChatPatch` увеличивает suppression до store change;
   - `handleChatStoreChange` не вызывает `sendState`;
   - patch отправляется в нужную surface.

Команды:

```bash
npm test -- --run src/extension/agent/agentController/postChatPatch.test.ts
npm test -- --run <новый-focused-test>
npm run typecheck
```

## Критерии приёмки

- Для patchable daemon events не уходит лишний full state broadcast.
- Editor surface соседнего чата не получает patch чужого чата.
- Sidebar продолжает получать patch.
- События без patch продолжают отправлять full state там, где это нужно.

## Что не делать в этой задаче

- Не менять очередь refresh по чатам.
- Не менять файловое хранилище.
- Не менять React/webview components.
