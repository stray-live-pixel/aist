# UI Migration — финальный отчёт

Перенос UI проекта AIST с `src/webview/**` на новую client architecture (`src/ui/shared` +
оболочки `src/ui/web` / `src/ui/vscode`) с adapter contract и общим store.

## Коммиты (ветка web-ui)

1. `a4aae2a` ui-architecture-audit-and-plan — аудит + план переноса.
2. `0129670` shared-ui-foundation: relocate — `git mv src/webview` → `src/ui/shared` (572 файла),
   flatten `shared/{ui,lib,i18n,types}`, правка внешних потребителей.
3. `6a3a7b7` shared-adapter-contracts — порт `AgentHost` (postMessage/subscribe/persisted) + mock +
   vscode adapter; общий UI ходит к хосту через `getAgentHost()`, удалён хардкод `acquireVsCodeApi`.
4. `5211a80` shared-ui-foundation: Zustand store — общий store (Zustand + devtools), единый error
   surface, `ingest()`; `App.tsx` стал тонким consumer; + store unit-тест.
5. `af6efd9` web-shell-adapter — web shell рендерит общий App через `createWebAgentHost` (RPC+SSE);
   SCSS-modules в build-web; mock web entry + Playwright web e2e; data-test-id у composer.
6. `e686d29` cleanup — удалён старый web MVP (App/barrel/components/format/styles).
7. `1e2146f` cleanup-docs — `agentWebTypes` перенесён в `src/ui/web`; обновлены AGENTS.md и план.
8. `d9758eb` test — import-boundary проверка переориентирована на `src/ui/shared`.

## Что перенесено

- **Весь UI** (pages chat/permissions/autonomous/isolation, widgets, features, entities, shared
  UI-kit, i18n ru/en, types, storybook) `src/webview` → `src/ui/shared`. Один общий UI для всех
  оболочек, история git сохранена через `git mv`.
- **Adapter contract**: `src/ui/shared/api/AgentHost.types.ts` + singleton + host-neutral сообщения +
  `mock/createMockAgentHost`. Реализации: `src/ui/vscode/adapters/createVscodeAgentHost` (postMessage),
  `src/ui/web/adapters/createWebAgentHost` (HTTP RPC + SSE, action→RPC, `DaemonState`→`AgentState`).
- **Store**: `src/ui/shared/store/agentStore.ts` на Zustand + devtools (projection, страницы,
  единый error surface). `useAgentState`/`useActiveChat` читают store.
- **Обе оболочки** рендерят один и тот же `src/ui/shared/app` через свои адаптеры. VS Code сохраняет
  полное поведение (адаптер 1:1 повторяет прежний seam). Web рендерит общий UI в браузере.
- **Web e2e на mock adapter** (`tests/web-e2e/`) + `playwright.web.config.ts` для chat-flow.
- Документация: AGENTS.md (карта `src/ui`, поток данных через AgentHost), план и этот отчёт.

## Что проверено (всё PASS)

| Проверка | Команда | Результат |
| --- | --- | --- |
| typecheck | `npm run typecheck` | PASS |
| полная сборка | `npm run build` | PASS |
| web сборка | `npm run build:web` | PASS |
| vscode сборка | `npm run build:webview` | PASS |
| web e2e (mock) | `npm run test:web-e2e` | PASS (1) |
| unit shared UI | `vitest run src/ui/shared` | PASS (53) |

Полный `vitest run`: 348 passed, 4 failed — все 4 **пред-существующие** (подтверждено прогоном на
baseline `7268299`): help-snapshot (baseline добавил команду `aist web` без обновления snapshot) и
3 environment-зависимых теста (autonomous discovery/orchestrator, isolation — docker/python/fs).
Миграция **не внесла ни одной регрессии** (единственная сломанная move-ом проверка import-boundary
исправлена в `d9758eb`).

## Definition of Done

- [x] Общий UI не импортирует VS Code/web/desktop API (порт AgentHost; проверяется import-boundary тестом).
- [x] Web и VS Code используют один shared UI.
- [x] UI тестируется через web e2e на mock adapter.
- [x] Основные сценарии имеют loading/error/empty/pending states (сохранены + единый error surface).
- [x] Сборка и typecheck проходят.
- [x] Документация актуальна.
- [~] Компоненты разложены по новой структуре — частично (см. риски).

## Оставшиеся риски / работа

1. **Convention pass (механически).** Легаси-компоненты используют имена `Button.tsx` + barrel
   `index.ts`. Новый foundation-код (`api/store/adapters/web`) уже следует конвенции
   `Component.tsx/.types.ts/.storybook.tsx` без barrel. Существующие компоненты уже разложены
   per-folder (со своими `.module.scss`/`.stories.tsx`), поэтому это переименование/удаление barrel,
   а не реструктуризация. Делается инкрементально по вертикали с проверкой `tsc`; высокая churn-цена.
2. **Web data-паритет.** Web server отдаёт только `DaemonState`; полный `AgentState`
   (модели/режимы/permissions/телеметрия) на web ещё не собирается. Web adapter накладывает реальные
   chat-данные на безопасный baseline (`createDefaultAgentState`) — chat-flow работает, остальные
   страницы показывают дефолты. Полная сборка `AgentState` в `src/ui/web/server` — отдельная задача.
3. **Capability-порты.** clipboard/localStorage/AudioContext доступны во всех webview-средах, но для
   desktop/headless их стоит вынести в `AgentHost`.
4. **Расширение тестов.** Web e2e и Storybook states для settings/autonomous/isolation вертикалей.
5. **Пред-существующие падающие тесты** (help-snapshot, autonomous/isolation env-тесты) не относятся
   к миграции, но их стоит починить отдельно.
