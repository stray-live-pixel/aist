# UI Migration Plan: src/webview → src/ui (shared + web + vscode)

Этот документ — результат аудита и план переноса текущего UI на новую client architecture
(`client-development-style.md`) и server style (`development-style.md`).

## 1. Что есть сейчас (аудит)

- **`src/webview/**`(572 файла)** — зрелое FSD-приложение:`app/`, `pages/`(chat, permissions,
autonomous, isolation),`widgets/message-list`, `features/\*`, `entities/message`, `shared/{ui,lib,i18n,types}`,
`storybook/`. Это единственный полноценный UI; его рендерит VS Code.
- **`src/ui/web/**`+`src/ui/shared/**` (~26 файлов)** — отдельный минимальный web-MVP с barrel `index.ts`,
  ручным `App.tsx`, который сам ходит в `/api/rpc` + `EventSource`. Архитектурно расходится с webview.
- **`src/ui/web/server/**`\*\* — Fastify web server adapter (RPC + SSE → daemon). Уже соответствует
  server-style.

### Host-coupling (где UI завязан на среду запуска)

Связность среды **централизована** и невелика:

| Точка           | Файл                                                                                                                             | Что делает                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| postMessage out | `shared/lib/agentActions/post.ts`                                                                                                | `vscode.postMessage(message)` для всех действий     |
| postMessage out | `shared/lib/autonomousActions.ts`                                                                                                | `vscode.postMessage(...)` для autonomous            |
| vscode handle   | `shared/lib/vscode.ts`                                                                                                           | `acquireVsCodeApi()` singleton                      |
| inbound events  | `app/App.tsx`, `pages/chat/ChatPageParts/ChatPage.tsx`                                                                           | `window.addEventListener('message')`                |
| store           | `shared/lib/agentState.tsx`                                                                                                      | React context со снапшотом `AgentState` (read-only) |
| browser ports   | `ApprovalPromptModal` (AudioContext), `promptHistory` (localStorage), `CopyMessageButton` (clipboard), `ChatPage` (window focus) | браузерные API, доступные во всех webview-средах    |

**Важно:** `src/webview/**` практически **не импортируется** из `src/extension/**`, `src/core/**`,
`src/cli/**` (связь только через postMessage). Единственные внешние потребители UI-дерева:
`tests/component-screenshots/harness.tsx`, `.storybook/{main,preview}`, `knip.json`. Это делает
безопасным **перенос дерева целиком**.

## 2. Целевая структура

```text
src/ui/
  shared/            # общий UI, не знает про среду запуска
    app/             # корневой App + bootstrap (рендерит страницы)
    pages/           # chat, permissions(settings), autonomous, isolation
    widgets/         # message-list, ...
    features/        # send-message, select-model, select-agent-mode, configure-tool-permission, ...
    entities/        # message (cards, tool results, ...)
    ui/              # shared UI-kit (Button, Card, Select, Modal, ...)
    i18n/            # en.json, ru.json, translate, useI18n
    types/           # доменные projection-типы (AgentState, Chat, ...)
    api/             # adapter contracts: AgentHost, сообщения, mock adapter
    store/           # Zustand store (projection + actions + ingest)
    lib/             # transport-agnostic helpers (agentActions, agentPatches, ...)
    styles/          # tokens.css, globals.css
  web/               # web shell + adapter (HTTP RPC + SSE)
    app/             # web bootstrap
    adapters/        # createWebAgentHost
    server/          # Fastify server adapter (как сейчас)
  vscode/            # vscode shell + adapter (postMessage)
    app/             # vscode bootstrap
    adapters/        # createVscodeAgentHost
  desktop/           # подготовленная структура (без полной реализации)
```

## 3. Adapter contract (ядро)

Общий UI разговаривает с хостом через **один singleton-порт** `AgentHost` (заменяет нынешний
`vscode` singleton). Среда запуска создаёт реализацию и регистрирует её до рендера.

```ts
// src/ui/shared/api/AgentHost.types.ts
export interface AgentHost {
  postMessage(message: UiToHostMessage): void; // действие → хост/daemon
  subscribe(listener: (message: HostToUiMessage) => void): () => void; // снапшоты/патчи/события
  getPersistedState(): PersistedUiState | undefined; // напр. активный chatId
  setPersistedState(state: PersistedUiState): void;
}
```

- `UiToHostMessage` / `HostToUiMessage` — host-neutral алиасы существующих `WebviewToExtensionMessage` /
  `ExtensionToWebviewMessage` (формы уже транспорт-агностичны).
- **VS Code adapter:** `postMessage = vscode.postMessage`, `subscribe = window 'message'`,
  persisted = `vscode.get/setState`. Полный паритет (extension уже реализует все действия).
- **Web adapter:** `postMessage` транслирует действие в `rpc(method, params)`; `subscribe` открывает SSE и
  на каждое событие daemon отдаёт обновлённый `state`-снапшот. Действия без серверной поддержки деградируют
  явно (no-op + лог), не ломая ядро. Capability-порты (clipboard/storage/sound) — через тот же adapter.
- **Mock adapter:** in-memory снапшот + запись действий для Storybook / web e2e.

Store: **Zustand + devtools** держит projection `AgentState`, `page`, `errorModal`, autonomous/isolation
transient state, connection status, pending UI ops. Экшены вызывают `AgentHost.postMessage`; входящие
сообщения проходят через `ingest()` (переиспользует `applyAgentPatch`). `useAgentState()`/`useActiveChat()`
сохраняют API, читая из store.

## 4. Стратегия: strangler с зелёной сборкой на каждом коммите

1. **Релокация** `git mv src/webview/* → src/ui/shared/*` (flatten `shared/{ui,lib,i18n,types}`),
   правка путей у ~5 внешних потребителей, `tsc` как safety net. Сохраняем нынешний `vscode`/context seam —
   VS Code работает как раньше. `build:webview` и `build:web` зелёные.
2. **Adapter + store**: вводим `AgentHost` singleton и Zustand store на месте `vscode.ts`/context/`App` listener.
3. **Web shell**: `src/ui/web` рендерит общий App через web adapter (RPC+SSE), деградация неподдержанных действий.
4. **VS Code shell**: `src/ui/vscode` рендерит общий App через vscode adapter; переключаем `build:webview`.
5. **Convention pass** (инкрементально): убрать barrel `index.ts`, привести к `Component.tsx/.module.scss/
.types.ts/.storybook.tsx`, container/template для сложных страниц, data-test-id, UI states. Начинаем с
   `shared/ui` и chat-вертикали.
6. **Tests**: web e2e на mock adapter для ключевых flows; VS Code smoke только для adapter/lifecycle.
7. **Cleanup**: удалить web-MVP barrels, обновить docs/AGENTS.md, финальная верификация.

## 5. Коммиты (этапы)

1. `ui-architecture-audit-and-plan` — этот документ.
2. `shared-adapter-contracts` — `api/` контракты + mock adapter (новые файлы, ничего не ломают).
3. `shared-ui-foundation` — релокация дерева + Zustand store + adapter singleton + tokens/globals.
4. `migrate-chat-ui` — chat-вертикаль на новую конвенцию + container/template + states + data-test-id.
5. `migrate-settings-permissions-ui`.
6. `migrate-autonomous-isolation-ui`.
7. `web-shell-adapter` — финальный web shell + web adapter.
8. `vscode-shell-adapter` — vscode shell + adapter, переключение build.
9. `storybook-and-tests` — Storybook states + web e2e (mock) + unit для store/hooks.
10. `cleanup-docs-final-verification`.

## 6. Риски

- **Web паритет действий:** web server RPC покрывает chat-flow; остальные действия (settings/autonomous/
  isolation/vcs) требуют серверных методов. Решение: явная деградация в web adapter + поэтапное расширение
  server RPC. Web e2e идёт через mock adapter, поэтому не блокируется паритетом сервера.
- **Объём convention pass:** ~572 файла. Архитектура (один shared UI для обеих оболочек, adapter, mock-тесты,
  зелёная сборка) достигается раньше, чем полное переименование всех компонентов по 4-файловой схеме —
  это механическая работа, выполняется инкрементально и не блокирует DoD по архитектуре.
- **Browser ports в shared:** AudioContext/localStorage/clipboard доступны во всех webview-средах; постепенно
  выносятся в capability-порты adapter для desktop/headless.
