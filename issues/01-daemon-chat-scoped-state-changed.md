# Задача 01: сделать daemon `state.changed` привязанным к чату и убрать лишний full refresh-триггер

## Проблема

На каждое runtime-событие daemon сейчас делает два уведомления:

1. исходное runtime-событие, например `run.activity`, `model.request.updated`, `message.appended`;
2. дополнительное `state.changed`.

Ключевая проблема: дополнительный `state.changed` часто отправляется без `chatId`.

Из-за этого extension не понимает, какой чат изменился, и запускает полный refresh состояния всех чатов.

## Главная цель

Runtime-события конкретного чата не должны провоцировать полный refresh всех чатов.

## Область изменений

Основные файлы:

- `src/cli/daemonServer/methods/handleRuntimeEvent.ts`
- `src/cli/daemonServer/methods/broadcastStateChanged.ts`
- `src/extension/agent/webview/getDaemonEventChatId.ts`
- `src/cli/daemonProtocol/base.ts` или близкий файл с типами `DaemonEvent`, если потребуется уточнение типов

Тесты смотреть и расширять:

- `src/cli/daemon.testParts/03-aist-daemon-json-rpc-local-socket-runs-chats-in-pa.ts`
- `src/extension/agent/webview/getDaemonEventChatId.test.ts`
- похожие daemon/webview tests по событиям

## Детерминированный план реализации

1. Прочитать `handleRuntimeEvent.ts` и подтвердить, что `broadcastStateChanged(event.type)` вызывается без `chatId`.
2. Добавить маленькую утилиту или локальную функцию, которая достаёт `chatId` из runtime event:
   - если у события есть верхнеуровневый `chatId`, использовать его;
   - если у события есть `run.chatId`, использовать его;
   - иначе вернуть `undefined`.
3. В `handleRuntimeEvent` передавать `chatId` в `broadcastStateChanged`:
   - `await this.broadcastStateChanged(event.type, { chatId })`.
4. Не менять поведение событий, которые реально не относятся к конкретному чату.
5. Проверить, что `state.changed` для `run.activity`, `model.request.updated`, `model.response`, `run.started`, `run.finished` теперь содержит `chatId`.
6. Если часть runtime events уже не требует дополнительного `state.changed`, не удалять его в этой задаче, чтобы не смешивать изменения. Эта задача только делает событие chat-scoped.

## Тесты

Добавить regression-тест:

- запустить daemon test с одним chat.ask;
- дождаться runtime event с `chatId`;
- найти последующий `state.changed` с reason равным типу runtime event;
- проверить, что у `state.changed.chatId` равен id чата.

Минимальные проверки:

```bash
npm test -- --run src/cli/daemon.test.ts
npm test -- --run src/extension/agent/webview/getDaemonEventChatId.test.ts
npm run typecheck
```

## Критерии приёмки

- `state.changed` от chat-scoped runtime events содержит `chatId`.
- События без chat context продолжают работать как раньше.
- Нет full state refresh из-за отсутствующего `chatId` для обычных событий активного агента.
- Тесты покрывают regression.

## Что не делать в этой задаче

- Не переписывать очередь refresh в extension.
- Не менять файловое хранилище чатов.
- Не удалять `state.changed` полностью.
- Не менять webview UI.
