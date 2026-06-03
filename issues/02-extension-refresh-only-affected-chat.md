# Задача 02: обновлять только затронутый чат вместо полного state refresh

## Зависимость

Выполнять после задачи 01.

## Проблема

Extension выбирает между двумя путями:

- если у daemon event есть `chatId`, вызвать `refreshBridgeChat`;
- если `chatId` нет, вызвать `refreshBridgeState`.

После задачи 01 у большинства runtime-related `state.changed` должен появиться `chatId`. Нужно закрепить это поведение и не позволить обычным событиям агента уходить в полный refresh.

## Главная цель

При событиях активного агента extension должен обновлять только конкретный чат, а не перечитывать все чаты.

## Область изменений

Основные файлы:

- `src/extension/agent/daemon/bridge/queueBridgeRefresh.ts`
- `src/extension/agent/webview/getDaemonEventChatId.ts`
- `src/extension/agent/webview/getDaemonEventChatId.test.ts`
- `src/extension/agent/daemon/bridge/refreshBridgeState.ts`
- `src/extension/agent/daemon/bridge/refreshBridgeChat.ts`

## Детерминированный план реализации

1. Прочитать `queueBridgeRefresh.ts` и зафиксировать текущую ветку `chatId ? refreshBridgeChat : refreshBridgeState`.
2. Расширить тесты `getDaemonEventChatId`, чтобы покрыть:
   - runtime event с верхнеуровневым `chatId`;
   - `run.started` / `run.finished` с `run.chatId`;
   - `state.changed` с `chatId`;
   - событие без chat context, где `chatId` должен быть `undefined`.
3. Добавить focused-тест для bridge queue behavior, если уже есть test harness; если harness нет, создать минимальный unit-тест для чистого helper/decision-функции.
4. Если `queueBridgeRefresh` сейчас трудно тестировать из-за большого context, вынести выбор refresh-стратегии в отдельную функцию в отдельном файле, например:
   - `src/extension/agent/daemon/bridge/getBridgeRefreshTarget.ts`.
5. Функция должна возвращать:
   - `{ kind: 'chat', chatId }` для событий с chatId;
   - `{ kind: 'state' }` только для событий без chatId.
6. Использовать эту функцию в `queueBridgeRefresh`.
7. Убедиться, что обычные runtime events больше не запускают `refreshBridgeState`.

## Тесты

Минимальные тест-кейсы:

1. `state.changed` с `chatId` → target `{ kind: 'chat', chatId }`.
2. `run.activity` с `chatId` → target `{ kind: 'chat', chatId }`.
3. `run.finished` с `run.chatId` → target `{ kind: 'chat', chatId }`.
4. lifecycle event без `chatId` → target `{ kind: 'state' }`.

Команды:

```bash
npm test -- --run src/extension/agent/webview/getDaemonEventChatId.test.ts
npm test -- --run <новый-focused-test>
npm run typecheck
```

## Критерии приёмки

- Runtime-события конкретного чата приводят только к `refreshBridgeChat`.
- Полный `refreshBridgeState` остаётся только для событий, которые реально меняют весь список или глобальное состояние.
- Решение покрыто unit-тестами.

## Что не делать в этой задаче

- Не менять структуру очереди refresh.
- Не менять chat repository.
- Не менять webview rendering.
