# Server Development Style

## Главный принцип

Server-код должен быть понятен новичку без знания истории проекта. Если разработчика разбудить ночью, он должен быстро найти точку входа, список routes, handler нужного endpoint-а и ближайшие utilities.

## Декомпозиция

- Предпочитаем небольшие файлы.
- Один файл может содержать несколько функций, если они описывают один цельный сценарий.
- Комфортный размер файла: до 250 строк.
- Не дробим код на случайную россыпь helper-функций.
- Не создаём абстракции заранее. Выносим код, если он уже переиспользуется, очевидно универсален или станет полезным shared API.

## Рост папок

Папка не должна превращаться в плоскую свалку файлов. Если в папке становится много файлов, ориентир — больше 10, раскладываем их по понятным смысловым группам.

Ориентиры:

- 1 файл — отдельная папка обычно не нужна.
- 2-10 файлов — можно держать плоско, если у них один смысл.
- 10+ файлов или разные смыслы — группируем по назначению.

Примеры группировки:

```text
utils/
  fs/
    resolveStaticRoot.ts
    contentType.ts
  http/
    sse.ts
    mapHttpError.ts

routes/
  api/
    rpc/
    events/
  static/
```

Группировка должна помогать навигации. Не создаём папку ради одного файла, если нет понятного будущего места для соседних файлов.

Папки могут быть не только `utils`. Используем простые FSD-like группы по смыслу:

```text
server/
  daemon/
  routes/
  model/
  utils/
  config/

ui/
  features/
  entities/
  shared/
```

Если код описывает продуктовую часть, лучше дать папке продуктовое имя (`daemon`, `routes`, `approvals`, `workspaces`), а не прятать всё в `utils`.

Нейминг должен быть простой и предсказуемый: по названию файла и папки должно быть понятно, что внутри и куда смотреть дальше.

## Index-файлы

Не создаём `index.ts` / `index.tsx` как barrel-файлы.

Они быстро превращаются в мусорный фасад, который сложно поддерживать и который разработчики всё равно обходят прямыми импортами.

Импортируем нужный файл напрямую:

```ts
import { handleRpcRoute } from './routes/api/rpc/handleRpcRoute';
```

Исключение — настоящий runtime entrypoint, где имя `index` требуется инструментом сборки или платформой. Для обычной организации модулей `index` не используем.

## Структура server-кода

Server-код должен быть routes-first:

- routes видны в одном месте;
- каждый endpoint ведёт в отдельный handler;
- файловая структура повторяет path роута;
- вспомогательные функции лежат в `utils`;
- действительно общие utilities лежат в `shared`.

Пример:

```text
src/ui/web/server/
  runWebUiServer.ts
  createServer.ts
  routes.ts

  daemon/
    connectDaemon.ts
    registerBrowserClientHandlers.ts

  routes/
    api/
      rpc/
        handleRpcRoute.ts
        mapRpcError.ts
      events/
        handleEventsRoute.ts
    static/
      handleStaticRoute.ts

  utils/
    contentType.ts
    resolveStaticRoot.ts
    sse.ts
```

## Порядок чтения server-кода

Новый разработчик должен читать server-код в таком порядке:

1. `runWebUiServer.ts` — запуск и shutdown.
2. `createServer.ts` — создание Fastify instance.
3. `routes.ts` — список endpoints.
4. Handler нужного route.
5. Dependencies и utilities, которые явно переданы handler-у.

Пример:

```text
runWebUiServer.ts
  -> createServer.ts
    -> routes.ts
      -> routes/api/rpc/handleRpcRoute.ts
        -> routes/api/rpc/mapRpcError.ts
```

Если этот путь чтения ломается, структура стала слишком неявной.

## Routes

Fastify routes регистрируются в одном файле, например `routes.ts`.

```ts
server.post('/api/rpc', (request, reply) => handleRpcRoute({ request, reply, deps }));
server.get('/api/events', (request, reply) => handleEventsRoute({ request, reply, deps }));
server.setNotFoundHandler((request, reply) => handleStaticRoute({ request, reply, deps }));
```

Так список HTTP API виден сразу, а детали каждого endpoint-а живут рядом со своим handler-ом.

## Не смешиваем слои

В одном файле не смешиваем разные уровни ответственности.

Примеры:

- `routes.ts` регистрирует routes, но не содержит daemon lifecycle.
- `handleRpcRoute.ts` обрабатывает RPC request, но не раздаёт static assets.
- `connectDaemon.ts` подключает daemon, но не знает про Fastify routes.
- `handleStaticRoute.ts` раздаёт файлы, но не знает про approvals/chats/runs.

Если файл одновременно делает routing, daemon lifecycle, static serving и business mapping — его нужно разделить.

Плохо:

```text
runWebUiServer.ts
  start daemon
  create Fastify
  register routes
  handle /api/rpc
  handle /api/events
  serve static files
  map RPC errors
```

Хорошо:

```text
runWebUiServer.ts              запуск и shutdown
createServer.ts                создание Fastify instance
routes.ts                      список endpoints
routes/api/rpc/handleRpcRoute.ts
routes/api/events/handleEventsRoute.ts
routes/static/handleStaticRoute.ts
daemon/connectDaemon.ts
```

## Black box правило

Каждая фича должна выглядеть как независимый black box с понятным API.

Фича может зависеть от:

- своих внутренних файлов;
- `shared` слоя;
- явно переданных dependencies.

Фича не должна неявно тянуть детали соседней фичи.

## Импорты

Импорты должны сохранять границы фич.

Можно:

```ts
import type { AgentWebRpcRequest } from '../../shared/agentWebTypes';
import { handleRpcRoute } from './routes/api/rpc/handleRpcRoute';
import { resolveStaticRoot } from './utils/fs/resolveStaticRoot';
```

Нельзя тянуть внутренности соседней фичи без явного API:

```ts
import { mapApprovalPreview } from '../approvals/internal/mapApprovalPreview';
```

Правила:

- прямые импорты лучше barrel-файлов;
- импорт из `shared` разрешён, если код действительно общий;
- route handler может импортировать свои внутренние helpers;
- соседние routes/features не должны импортировать внутренние helpers друг друга;
- глубокий импорт внутрь соседней фичи — smell.

Плохо:

```ts
import { mapRpcError } from '../events/internal/mapRpcError';
```

Хорошо:

```ts
import { createSseMessage } from '../../../utils/http/createSseMessage';
import { mapRpcError } from './mapRpcError';
```

## Зависимости

Зависимости передаём явно через объектные аргументы.

Route handler не должен сам искать daemon client, static root, event clients или глобальный state. Всё, что нужно handler-у, передаётся снаружи:

```ts
handleRpcRoute({ request, reply, deps });
```

Так проще тестировать код и понимать, от чего зависит конкретная часть системы.

Плохо:

```ts
export async function handleRpcRoute({ request, reply }) {
  const result = await globalDaemonClient.request(request.body.method);
  return reply.send(result);
}
```

Хорошо:

```ts
export async function handleRpcRoute({ request, reply, deps }) {
  const result = await deps.daemonClient.request(request.body.method);
  return reply.send(result);
}
```

## Shared и server adapter

`src/ui/shared/**` не знает про host-окружение.

В shared не импортируем:

- VS Code API;
- Fastify;
- Tauri;
- Node `fs`, `path`, `http`;
- browser-only globals, если код должен жить во всех оболочках.

Shared хранит только общий UI, типы, store, hooks и transport contracts.

`src/ui/web/server/**` — server adapter. Он адаптирует HTTP/SSE/Fastify к daemon, но не становится backend source of truth и не содержит бизнес-логику агента.

## Daemon как source of truth

Daemon/core — единственный source of truth для chats, runs, tools, approvals, memory и isolation sessions.

UI может хранить только:

- projection daemon state;
- cache;
- выбранные панели/страницы;
- временное состояние интерфейса.

UI не должен принимать backend-решения вместо daemon.

## Аргументы

Всегда используем объектные аргументы:

```ts
handleRpcRoute({ request, reply, deps });
```

Не используем позиционные аргументы для application-кода:

```ts
handleRpcRoute(request, reply, deps);
```

Объектные аргументы лучше читаются и проще расширяются.

## Нейминг

Используем простую терминологию:

- `server`;
- `route`;
- `handler`;
- `daemon`;
- `client`;
- `utils`;
- `shared`.

Не смешиваем несколько словарей без необходимости: `gateway`, `surface`, `host`, `transport` используем только там, где они действительно уточняют смысл.

## Нейминг файлов

Используем простые и предсказуемые глаголы:

- `createX.ts` — создаёт объект или сервис.
- `handleXRoute.ts` — handler конкретного endpoint-а.
- `registerXRoutes.ts` — регистрирует группу routes.
- `mapXToY.ts` — преобразует данные.
- `resolveX.ts` — находит или вычисляет значение.
- `parseX.ts` — парсит и валидирует вход.
- `assertX.ts` — проверяет runtime-инвариант.

Название файла должно отвечать на вопрос: "что здесь происходит?"

Плохо:

```text
helpers.ts
manager.ts
serverStuff.ts
utils2.ts
```

Хорошо:

```text
createServer.ts
handleRpcRoute.ts
mapRpcError.ts
resolveStaticRoot.ts
connectDaemon.ts
```

## Ошибки

Ошибки мапим на response на границе route/transport.

Внутри feature можно бросать обычные ошибки или domain errors, но HTTP/JSON-RPC форма ошибки должна собираться в одном понятном месте рядом с route handler-ом.

## Тесты

Тесты не смешиваем с рабочим кодом. Для тестов используем папку `__tests__` рядом с тестируемой частью.

Примеры:

```text
shared/utils/fs/
  resolvePath.ts
  __tests__/
    resolvePath.test.ts

server/routes/api/rpc/
  handleRpcRoute.ts
  __tests__/
    handleRpcRoute.test.ts
```

Для route handler-а тестируем handler без поднятия сервера. Для wiring server-а достаточно одного smoke/integration test.

## Комментарии

Комментарии пишем как продуктовый контекст, а не пересказ кода.

Хороший комментарий отвечает:

- зачем это нужно;
- какую пользовательскую или продуктовую проблему решает;
- почему выбрано именно такое поведение.

Пишем простыми словами, как для junior-разработчика, тестировщика, менеджера или ИИ-агента.

Не пишем комментарии вида "увеличиваем счётчик на 1", если это очевидно из кода.

Плохо:

```ts
// Send response.
return reply.send(response);
```

Хорошо:

```ts
// Web UI возвращает ошибки в JSON-RPC-like форме, чтобы клиент показывал
// одинаковые сообщения для локального daemon и будущего remote server.
return reply.send(response);
```

## KISS

No clever code.

Предпочитаем простые решения:

- меньше магии;
- меньше неявных side effects;
- меньше универсальных `manager/engine/factory`, если достаточно route handler-а;
- меньше динамики без необходимости;
- понятный flow важнее красивой абстракции.
