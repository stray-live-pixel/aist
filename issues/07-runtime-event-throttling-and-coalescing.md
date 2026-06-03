# Задача 07: снизить частоту runtime progress events и лишних записей

## Зависимость

Выполнять после задач 01–06.

## Проблема

Даже после исправления full refresh и индекса поток событий может быть слишком частым.

Сейчас `createActivityStream` делает flush примерно раз в 120 мс на агента:

- `src/core/app/runtime/agentRuntime/createActivityStream.ts`

Каждый flush может привести к:

- записи `state.json`;
- записи run event;
- daemon event;
- bridge refresh;
- webview patch.

При двух параллельных агентах это может быть заметной нагрузкой.

## Главная цель

Сохранить ощущение живого progress, но уменьшить количество redundant updates.

## Область изменений

Основные файлы:

- `src/core/app/runtime/agentRuntime/createActivityStream.ts`
- `src/core/app/runtime/agentRuntime/actions/setActivity.ts`
- `src/core/app/runtime/agentRuntime/actions/setActivityDetail.ts`
- `src/core/app/runtime/agentRuntime/actions/updateModelRequest.ts`
- возможно `src/extension/agent/daemon/bridge/queueBridgeRefresh.ts`, если coalescing удобнее делать на стороне bridge

## Детерминированный план реализации

1. Прочитать `createActivityStream.ts` и текущий throttle `120` мс.
2. Добавить защиту от повторной отправки одинакового detail:
   - если следующий detail равен последнему отправленному detail, ничего не отправлять.
3. Добавить минимальный интервал для activity detail updates, например 250 мс, если UX позволяет.
4. Не задерживать финальный `onComplete`: финальное состояние должно отправляться сразу.
5. В `setActivityDetail` избежать лишней записи, если текущий чат уже содержит такой же `activityDetail`.
6. В `setActivity` избежать лишней записи, если `activity` и `detail` не изменились.
7. В `updateModelRequest` не писать state и не отправлять event, если patch не меняет фактические поля request.
8. Все сравнения делать простыми и детерминированными, без глубоких дорогих diff там, где достаточно сравнить конкретные поля.

## Тесты

Добавить/обновить unit-тесты:

1. Несколько одинаковых content delta подряд не создают несколько одинаковых activity updates.
2. `onComplete` всё равно отправляет финальный update.
3. `setActivityDetail` не пишет repository, если detail не изменился.
4. `updateModelRequest` не emit-ит событие при no-op patch.
5. При реальном изменении activity/modelRequest событие сохраняется.

Команды:

```bash
npm test -- --run src/core/app/runtime/agentRuntime.test.ts
npm test -- --run <новый focused test для activity stream>
npm run typecheck
```

## Критерии приёмки

- Количество одинаковых progress updates снижено.
- UI всё ещё показывает живой streaming progress.
- Финальные события не теряются.
- No-op updates не пишут файлы и не шлют daemon events.

## Что не делать в этой задаче

- Не выключать streaming.
- Не удалять activity UI.
- Не менять формат RuntimeEvent.
- Не делать сложную telemetry-систему.
