# Задача 04: разделить refresh queue по чатам и коалесцировать события

## Зависимость

Выполнять после задач 01–03.

## Проблема

Сейчас в bridge одна общая очередь:

```ts
context.state.refreshQueue = context.state.refreshQueue.then(...)
```

Файл:

- `src/extension/agent/daemon/bridge/queueBridgeRefresh.ts`

Из-за этого refresh чата B ждёт refresh чата A. При двух параллельных агентах это создаёт ощущение, что агенты блокируют друг друга.

## Главная цель

События разных чатов должны refresh-иться независимо. События одного и того же чата должны сохранять порядок и не создавать лавину одинаковых refresh.

## Область изменений

Основные файлы:

- `src/extension/agent/daemon/bridge/BridgeRuntimeContext.ts`
- `src/extension/agent/daemon/bridge/queueBridgeRefresh.ts`
- возможно новый файл `src/extension/agent/daemon/bridge/queueChatScopedBridgeRefresh.ts`
- возможно новый файл `src/extension/agent/daemon/bridge/queueGlobalBridgeRefresh.ts`

## Детерминированный план реализации

1. В `BridgeRuntimeState` заменить или дополнить `refreshQueue`:
   - оставить `refreshQueue` для global state refresh;
   - добавить `refreshQueuesByChatId: Map<string, Promise<void>>`.
2. Для события с `chatId` использовать очередь конкретного чата.
3. Для события без `chatId` использовать global queue.
4. Global refresh должен быть осторожным:
   - либо ждать активные chat queues перед `replaceAll`,
   - либо выполняться отдельно, но не затирать более свежие chat updates.
5. Добавить простую коалесциацию по чату:
   - если для chatId уже есть pending refresh, не ставить бесконечно много одинаковых refresh подряд;
   - достаточно одного флага `pendingChatRefreshes: Set<string>` или `scheduledChatRefreshesById`.
6. После выполнения refresh удалить запись из `refreshQueuesByChatId`, если она больше не актуальна.
7. Ошибка refresh одного чата не должна ломать очереди других чатов.
8. Сохранить текущий behavior для autonomous events: они не должны попадать в chat refresh queue, если сейчас игнорируются.

## Рекомендуемая структура

Создать маленькие файлы вместо монолита:

- `queueBridgeRefresh.ts` — главный маршрутизатор;
- `queueBridgeChatRefresh.ts` — очередь конкретного чата;
- `queueBridgeStateRefresh.ts` — global refresh;
- `getBridgeRefreshTarget.ts` — если создан в задаче 02, переиспользовать.

## Тесты

Добавить unit-тесты на очередь:

1. Два события для разных chatId запускают два refresh независимо.
2. Два события для одного chatId выполняются последовательно.
3. Пять быстрых событий одного chatId коалесцируются в минимальное количество refresh, допустимо 1 или 2 в зависимости от реализации.
4. Ошибка refresh chat A не блокирует refresh chat B.
5. Global refresh не ломает chat-scoped refresh.

Команды:

```bash
npm test -- --run <новый bridge refresh queue test>
npm run typecheck
```

## Критерии приёмки

- Разные чаты больше не ждут одну общую refreshQueue.
- Очередь одного чата сохраняет порядок событий этого чата.
- Быстрые повторные события одного чата не создают бесконечную цепочку refresh.
- Ошибка одного refresh не останавливает все будущие refresh.

## Что не делать в этой задаче

- Не менять daemon event protocol.
- Не менять ChatRepository.
- Не менять webview UI.
