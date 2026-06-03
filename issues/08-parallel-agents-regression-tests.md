# Задача 08: regression-тесты параллельных агентов и отсутствия лишних full refresh

## Зависимость

Выполнять после задач 01–07.

## Проблема

Даже если каждое исправление работает отдельно, регрессия может вернуться через daemon events, bridge refresh или chat repository.

Нужен набор тестов, который проверяет именно сценарий двух параллельных чатов.

## Главная цель

Закрепить поведение: два агента в разных чатах работают параллельно, а UI/backend не делают лишний full refresh и не блокируют обновления друг друга.

## Область изменений

Основные тестовые зоны:

- `src/cli/daemon.test.ts`
- `src/cli/daemon.testParts/03-aist-daemon-json-rpc-local-socket-runs-chats-in-pa.ts`
- `src/extension/agent/daemon/bridge/*test.ts`
- `src/extension/agent/agentController/postChatPatch.test.ts`
- `src/core/entities/chat/chatRepository.test.ts`

Если e2e потребуется только позже, не добавлять его в эту задачу без отдельного согласования. Сначала unit/integration tests.

## Детерминированный план реализации

1. Добавить daemon integration regression:
   - создать два чата;
   - запустить `chat.ask` в первом;
   - не завершая первый model response, запустить `chat.ask` во втором;
   - проверить, что оба accepted;
   - проверить `activeRuns` содержит оба run;
   - проверить попытка второго ask в тот же chat всё ещё rejected как busy.
2. Расширить этот daemon test проверкой событий:
   - runtime events обоих чатов содержат корректный `chatId`;
   - `state.changed` для chat-scoped events содержит `chatId`;
   - нет unexpected global-only `state.changed` для обычных progress events, если предыдущие задачи удалили или ограничили их.
3. Добавить bridge unit/integration test:
   - смоделировать события двух разных chatId;
   - проверить, что refresh A и refresh B не блокируют друг друга глобальной очередью;
   - проверить, что repeated events одного chatId coalesced.
4. Добавить controller regression:
   - patchable daemon event не вызывает `sendState`;
   - patch отправляется sidebar и editor нужного chatId;
   - editor соседнего chatId patch не получает.
5. Добавить repository regression:
   - hot state update не меняет/не пересобирает index;
   - `chat.get` после hot update возвращает актуальный state.
6. Если есть performance telemetry helpers, добавить lightweight assertion на количество refresh вызовов в тестовом bridge context.
7. Все тесты должны быть детерминированными: использовать deferred promises/fake timers/fake `now`.

## Минимальные тестовые сценарии

### Сценарий A: daemon параллельность

Дано:

- chat A;
- chat B;
- model client с двумя deferred responses.

Шаги:

1. `chat.ask(A)` → accepted.
2. `chat.ask(B)` → accepted до завершения A.
3. `state.get` → `activeRuns.length === 2`.
4. `chat.ask(A)` ещё раз → busy error.
5. Завершить response A.
6. Проверить, что B всё ещё active.
7. Завершить response B.
8. Проверить, что activeRuns пустой.

### Сценарий B: extension refresh не глобальный

Дано:

- fake bridge context;
- события `run.activity` для chat A и chat B.

Ожидание:

- для каждого события вызывается `refreshBridgeChat` конкретного chatId;
- `refreshBridgeState` не вызывается.

### Сценарий C: patch без full state

Дано:

- patchable event для chat A;
- sidebar surface;
- editor A;
- editor B.

Ожидание:

- sidebar получает patch;
- editor A получает patch;
- editor B не получает patch;
- `sendState` не вызывается из-за этого patchable event.

## Команды проверки

```bash
npm test -- --run src/cli/daemon.test.ts
npm test -- --run src/core/entities/chat/chatRepository.test.ts
npm test -- --run src/extension/agent/agentController/postChatPatch.test.ts
npm test -- --run <новые bridge tests>
npm run typecheck
```

## Критерии приёмки

- Есть regression на два параллельных чата.
- Есть regression на отсутствие full refresh для chat-scoped events.
- Есть regression на patch без full state broadcast.
- Есть regression на отсутствие index rebuild на hot state update.
- Все тесты детерминированные и не зависят от реальных внешних model API.

## Что не делать в этой задаче

- Не исправлять новые найденные архитектурные проблемы внутри тестовой задачи.
- Если тест выявил новый баг, создать отдельный issue или вернуться к соответствующей предыдущей задаче.
- Не добавлять flaky e2e без необходимости.
