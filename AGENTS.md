# Карта проекта AIST для ИИ-агентов

Этот файл — быстрый вход в контекст проекта. Перед изменениями кода используй его как карту: сначала найди нужный слой и ключевые файлы, затем читай конкретные реализации и тесты рядом с ними.

## Короткий prompt для набора контекста

Скопируй этот блок в начало новой агентской сессии, если нужно быстро сориентироваться в проекте:

```text
Ты работаешь в проекте AIST — TypeScript VS Code extension с React webview и CLI daemon backend.

Сначала прочитай AGENTS.md, README.md, package.json и src/core/README.md. Затем выбери нужный слой:
- backend/runtime/инструменты/память/модели: src/core/** и src/cli/**;
- VS Code adapter, команды, diff preview, bridge к daemon: src/extension.ts и src/extension/**;
- webview UI: src/webview/**, docs/webview-design-system.md и Storybook stories рядом с компонентами;
- e2e/screenshot tests: docs/e2e-testing-skill.md и tests/e2e/** или tests/component-screenshots/**;
- пользовательская документация и сайт: docs/** и website/**.

Перед изменениями найди ближайший тест (*.test.ts, *.test.tsx, *.spec.ts) и публичный фасад/index.ts. Сохраняй границы слоёв: src/core не импортирует vscode, webview не зависит от extension host, extension остаётся thin-client/adapters слоем, daemon/core — source of truth для agent backend. После структурных изменений обнови AGENTS.md, если карта или список ключевых файлов устарели.
```

## Что это за проект

AIST — минимальный coding-agent для VS Code. Он открывает чат в sidebar/editor webview, отправляет запросы в OpenRouter или ChatGPT Codex, умеет читать workspace, запускать инструменты, запрашивать approvals и применять изменения через VS Code diff preview.

Основная идея архитектуры: backend живёт в CLI daemon и editor-agnostic core, а VS Code extension только показывает UI, управляет webview, запускает daemon, предоставляет editor context и нативные preview/adapters.

## Технологии и команды

- TypeScript, React 19, SCSS Modules, lucide-react.
- VS Code Extension API для host-слоя.
- esbuild для extension/webview bundles, tsc для typecheck.
- Vitest для unit-тестов, Playwright для e2e и screenshot-тестов, Storybook для UI.

Полезные команды:

```bash
npm run typecheck
npm run test
npm run build
npm run build:cli
npm run build:extension
npm run build:webview
npm run storybook
npm run test:e2e
npm run test:components:screenshots
```

Для точечной проверки предпочитай focused-тест рядом с изменяемым кодом, затем `npm run typecheck`.

## Верхнеуровневая структура

```text
src/
  extension.ts        VS Code activation entrypoint и регистрация команд.
  core/               Editor-agnostic runtime, доменная логика, tools, storage, models.
  cli/                CLI entrypoint, daemon server/client, JSON-RPC protocol.
  extension/          VS Code adapters: controller, daemon bridge, webview host, previews.
  webview/            React-приложение webview по FSD.

tests/
  e2e/                Playwright e2e сценарии VS Code webview.
  component-screenshots/ Playwright screenshot-тесты UI-компонентов.

docs/                 Markdown-документация.
website/              Astro/Starlight documentation site.
.aist-agent/          Project-shareable agent artifacts: settings, autonomous flows/runs.
scripts/              Build/install/optimization scripts.
assets/, media/       Логотипы и extension assets.
```

## Архитектурные слои и границы

### `src/core/**` — домен и runtime без VS Code

Core не импортирует `vscode`. Это общий backend слой для CLI daemon и thin clients.

- `src/core/app/**` — composition/runtime: config adapters и agent runtime service.
- `src/core/processes/**` — долгие процессы, сейчас autonomous backend/flows/runs/engines.
- `src/core/entities/**` — доменные сущности и persistence/transport: chats, runs, memory, model transports, storage.
- `src/core/features/**` — пользовательские возможности агента: approvals, context, compaction, planning, project tools, reflection, skills, telemetry, tool execution, system prompt.
- `src/core/tools/**` — Node-safe tools: filesystem tools и shell tools.
- `src/core/shared/**` — общие types/utilities без бизнес-сценариев.

Главный документ по границам core: `src/core/README.md`.

### `src/cli/**` — CLI и daemon backend

CLI предоставляет бинарь `aist` и daemon backend. Daemon — source of truth для chats/runs/tools/model requests/auth/memory/telemetry/autonomous sessions.

- CLI command parser/runner живёт в `src/cli/router.ts` и `src/cli/routerParts/**`.
- Daemon server живёт в `src/cli/daemonServer/**`.
- JSON-RPC protocol contracts живут в `src/cli/daemonProtocol/**` и фасаде `src/cli/daemonProtocol.ts`.
- Daemon client живёт в `src/cli/daemonClient/**`.

### `src/extension/**` и `src/extension.ts` — VS Code thin client/adapters

Здесь можно импортировать `vscode`. Этот слой отвечает за команды VS Code, webview panels/views, запуск daemon, editor context, diff preview, notifications, opening files и presentation state.

Важно: не переносить agent backend обратно в extension. Если логика должна работать headless/CLI — она должна жить в `src/core/**` или `src/cli/**`.

### `src/webview/**` — React UI

Webview построен по Feature-Sliced Design:

- `app/` — root React app, global styles, bootstrap.
- `pages/` — страницы: chat, settings/permissions, autonomous.
- `widgets/` — крупные композиционные блоки, если есть.
- `features/` — пользовательские действия: send-message, select-model, select-agent-mode, copy-message, permissions controls.
- `entities/` — UI-представления доменных сущностей: message cards, tool results, workspace links.
- `shared/` — i18n, types, agent actions/patches, shared UI-kit.
- `storybook/` — fixtures и stories infrastructure.

Перед UI-изменениями читай `docs/webview-design-system.md` и stories рядом с компонентом.

## Потоки данных

### Chat request flow

1. Пользователь вводит prompt в `src/webview/features/send-message/**`.
2. Webview отправляет message через `src/webview/shared/lib/agentActions/**`.
3. Extension host принимает его в `src/extension/agent/webview/messages/**`.
4. `src/extension/agent/daemon/bridge/**` отправляет JSON-RPC запрос daemon.
5. Daemon method в `src/cli/daemonServer/methods/chatAsk.ts` создаёт/ведёт run.
6. Runtime `src/core/app/runtime/agentRuntime.ts` готовит prompt, вызывает model client, исполняет tools и пишет события.
7. Daemon публикует events/state patches обратно в extension bridge.
8. Extension мапит daemon events в webview patches через `src/extension/agent/webview/mapDaemonEventToChatPatch.ts`.
9. Webview применяет patches в `src/webview/shared/lib/agentPatches/**`.

### Tool/approval flow

1. Runtime получает tool call от модели.
2. `src/core/features/tool-execution/**` и конкретные tools в `src/core/tools/**` готовят выполнение.
3. `src/core/features/approval/approvalProtocol.ts` определяет, нужен ли approval и preview.
4. Daemon держит pending approval в `src/cli/daemonServer/PendingApproval.ts` и methods around `approvalResolve`.
5. Extension показывает approval UI и для file edits может открыть native editable diff через `src/extension/tools/editableDiffPreview.ts`.
6. После approve/deny runtime продолжает run и пишет результат tool call в chat history.

### Isolated agent sessions flow

1. Пользователь открывает UI изолированных агентов в webview, выбирает single-step режим или autonomous flow и запускает задачу.
2. Webview отправляет `isolation.*` action через `src/webview/shared/lib/agentActions/**`, включая выбранный `flowId`, если нужен flow-based режим.
3. Extension controller вызывает daemon bridge methods в `src/extension/agent/daemon/bridge/**`.
4. Daemon JSON-RPC методы `isolation.*` управляют `src/cli/daemonServer/isolation/IsolationSessionManager.ts`; доступные flow modes берутся из autonomous definitions и попадают в daemon state.
5. Session manager резолвит GitHub remote/base metadata через `src/cli/daemonServer/isolation/git/IsolationGitService.ts` и запускает `docker-local` provider без host worktree mount.
6. Контейнер сам клонирует репозиторий в `/workspace`, устанавливает AIST CLI и создаёт рабочую ветку через helpers в `src/cli/daemonServer/isolation/container/**`.
7. Если выбран flow, manager запускает `src/core/processes/autonomous/flow/orchestrator.ts` через daemon-only adapter `src/cli/daemonServer/isolation/flow/createIsolatedAgentAutonomousEngine.ts`.
8. Isolated adapter исполняет каждую stage через `src/cli/daemonServer/methods/runIsolationAgent.ts`: live chat/runtime state остаётся в daemon, а filesystem tools, bash, project tools и skills выполняются внутри контейнера против `/workspace`.
9. Autonomous flow state пишется в project/user autonomous session storage, а compact stage state попадает в `IsolationSessionSummary.flow`.
10. После всего workflow manager делает commit/push/PR внутри контейнера, уничтожает контейнер и пишет durable state/logs в user workspace storage.
11. Daemon публикует `isolation.session.*` события, а extension после reconnect перечитывает `state.get`.
12. Webview получает актуальные `isolationFlowModes` и `isolationSessions` в `AgentState`, поэтому закрытие/открытие VS Code не требует ручных terminal-команд.

### Storage policy

- Project-shareable: `<workspace>/.aist-agent` — project memory, declarative tools, autonomous definitions, settings.
- User-personal: `~/.aist-agent/workspaces/<workspace-key>` — chats, runs, daemon logs, telemetry, autonomous session logs/results.
- User defaults/secrets: `~/.aist-agent`, не workspace.
- Все workspace-relative paths должны проходить storage guard/core path guard.

## Ключевые файлы

### Project metadata и сборка

- `package.json` — extension contributions, commands, configuration schema, npm scripts, dependencies.
- `package-lock.json` — locked dependency graph.
- `tsconfig.json`, `tsconfig.cli.json` — TypeScript configs.
- `eslint.config.mjs` — lint rules и import boundary guard для core.
- `scripts/build-webview.mjs` — webview build pipeline.
- `.storybook/main.ts`, `.storybook/preview.tsx` — Storybook config.
- `playwright.config.ts`, `playwright.component-screenshots.config.ts` — e2e/screenshot test configs.

### Документация и агентские инструкции

- `AGENTS.md` — эта карта проекта для ИИ-агентов.
- `README.md` — краткое описание, install и основные features.
- `docs/README.md` — карта пользовательской документации.
- `docs/development.md` — development/release flow и daemon backend notes.
- `docs/configuration.md` — настройки extension.
- `docs/tools-and-safety.md` — tools, approvals, safety.
- `docs/daemon-json-rpc.md` — daemon JSON-RPC описание.
- `docs/approval-protocol.md` — backend approval protocol.
- `docs/agent-customization.md` — instructions/modes/skills.
- `docs/webview-design-system.md` — правила UI/design system.
- `docs/e2e-testing-skill.md` — правила e2e Playwright тестов.
- `src/core/README.md` — актуальные границы core и storage policy.

### Core runtime и backend domain

- `src/core/index.ts` — публичный core facade.
- `src/core/app/runtime/agentRuntime.ts` — главный orchestrator agent run lifecycle.
- `src/core/app/runtime/stages/*.ts` — стадии runtime: preparePrompt, memory, model loop, finalize/stop.
- `src/core/app/config/config.ts` — Node-safe config/secret store contracts and adapters.
- `src/core/entities/chat/chatRepository.ts` — facade chat persistence.
- `src/core/entities/run/runRepository.ts` — facade run persistence.
- `src/core/entities/memory/memory.ts` — agent memory store/retrieval facade.
- `src/core/entities/storage/storage.ts` — storage path policy and file primitives.
- `src/core/entities/model/openrouterTransport.ts` — OpenRouter transport facade.
- `src/core/entities/model/codexTransport.ts` — ChatGPT Codex transport facade.
- `src/core/features/approval/approvalProtocol.ts` — approval protocol facade.
- `src/core/features/context/contextGovernor.ts` — context budget/governance.
- `src/core/features/compaction/compaction.ts` — chat compaction.
- `src/core/features/memory-subagent/index.ts` — memory subagent public API.
- `src/core/features/project-tools/projectTools.ts` — declarative project tools discovery/execution.
- `src/core/features/reflection/reflection.ts` — post-run reflection candidates.
- `src/core/features/performanceTelemetry/index.ts` — telemetry public API.
- `src/core/features/system-prompt/filePromptConfig/buildFileAgentSystemPrompt.ts` — file-based system prompt assembly.
- `src/core/tools/fs/node_filesystem_tools/nodeFilesystemTools.ts` — registry/runner for filesystem tools.
- `src/core/tools/scripts/sh/run_bash_script/runBashScript.ts` — Bash tool implementation.

### Autonomous processes

- `src/core/processes/autonomous/index.ts` — autonomous public API.
- `src/core/processes/autonomous/discovery.ts` — flow/run discovery facade.
- `src/core/processes/autonomous/backend.ts` — backend facade.
- `src/core/processes/autonomous/flow/orchestrator.ts` — autonomous flow orchestration.
- `src/core/processes/autonomous/engines/registry.ts` — engine registry.
- `.aist-agent/autonomous/flows/**` — project autonomous flow definitions.
- `.aist-agent/autonomous/runs/**` — project autonomous run definitions.

### CLI и daemon

- `src/cli/main.ts` — executable entrypoint.
- `src/cli/index.ts` — CLI public exports.
- `src/cli/router.ts` — CLI command router facade.
- `src/cli/routerParts/runCli.ts` — CLI runner orchestration.
- `src/cli/daemon.ts` — daemon command entry.
- `src/cli/daemonIndex.ts` — daemon exports.
- `src/cli/daemonProtocol.ts` — JSON-RPC protocol facade.
- `src/cli/daemonProtocol/*.ts` — typed protocol contracts by domain.
- `src/cli/daemonServer/AistDaemonServer.ts` — daemon server class.
- `src/cli/daemonServer/installAistDaemonServerMethods.ts` — method registration.
- `src/cli/daemonServer/methods/chatAsk.ts` — chat ask method.
- `src/cli/daemonServer/methods/createRuntime.ts` — runtime composition for daemon.
- `src/cli/daemonServer/methods/createToolCallHandler.ts` — tool call handler composition.
- `src/cli/daemonServer/methods/getState.ts` — daemon state assembly.
- `src/cli/daemonClient/DaemonJsonRpcClient.ts` — JSON-RPC client.
- `src/cli/daemonProtocol/isolation.ts` — JSON-RPC contracts for isolated agent sessions.
- `src/cli/daemonServer/isolation/IsolationSessionManager.ts` — durable isolated session lifecycle/state manager.
- `src/cli/daemonServer/isolation/flow/createIsolatedAgentAutonomousEngine.ts` — adapter `AutonomousEngine` для выполнения flow stages через isolated `AgentRuntimeService`.
- `src/cli/daemonServer/isolation/git/IsolationGitService.ts` — isolated git worktree, commit, push and PR finalizer.
- `src/cli/daemonServer/isolation/LocalDockerIsolationProvider.ts` — local Docker container lifecycle provider.
- `src/cli/daemonServer/isolation/runtime/createIsolatedToolCallHandler.ts` — isolated tool runner adapter; bash goes through Docker, file tools use worktree.
- `src/cli/daemonServer/isolation/runtime/createInMemoryIsolationChatRepository.ts` — transient chat repository for detached isolated runtime runs.
- `src/cli/daemonServer/methods/runIsolationAgent.ts` — daemon method that runs isolated `AgentRuntimeService` against worktree/container.

### VS Code extension host

- `src/extension.ts` — activation, commands and view registration.
- `src/extension/agent/agentController.ts` — agent controller facade.
- `src/extension/agent/agentController/*.ts` — controller actions/state/posting.
- `src/extension/agent/daemon/bridge.ts` — daemon bridge facade.
- `src/extension/agent/daemon/bridge/VscodeDaemonRuntimeBridge.ts` — bridge runtime implementation.
- `src/extension/agent/daemon/processManager.ts` — daemon process lifecycle facade.
- `src/extension/agent/daemon/chatStore.ts` — extension-side chat state store facade.
- `src/extension/agent/webview/host.ts` — webview host.
- `src/extension/agent/webview/page.ts` — webview HTML/page setup.
- `src/extension/agent/webview/messages/index.ts` — webview message dispatcher.
- `src/extension/agent/webview/statePresenter.ts` — state presentation to webview surfaces.
- `src/extension/agent/webview/mapDaemonEventToChatPatch.ts` — daemon event to UI patch mapping.
- `src/extension/tools/editableDiffPreview.ts` — VS Code-native editable diff preview facade.
- `src/extension/tools/permissions.ts` — extension tool permissions helpers.
- `src/extension/shared/i18n/*.json` — extension host translations.

### Webview UI

- `src/webview/app/index.tsx` — React bootstrap.
- `src/webview/app/App.tsx` — top-level app routing/state composition.
- `src/webview/app/styles.css` — global webview styles and CSS variables.
- `src/webview/pages/chat/ChatPage.tsx` — chat page facade.
- `src/webview/pages/chat/ChatPageParts/ChatPage.tsx` — chat page implementation.
- `src/webview/features/send-message/Composer.tsx` — composer facade.
- `src/webview/features/send-message/Composer/useComposerController.ts` — composer controller hook.
- `src/webview/features/select-model/ModelSelect.tsx` — provider/model selector.
- `src/webview/features/select-agent-mode/AgentModeSelect.tsx` — mode selector.
- `src/webview/entities/message/message-card/MessageCard.tsx` — user/assistant message card.
- `src/webview/entities/message/tool-message-card/ToolMessageCard.tsx` — tool call card.
- `src/webview/entities/message/tool-result-preview/ToolResultPreview.tsx` — tool result preview facade.
- `src/webview/entities/message/tool-message-model/toolMessageModel.ts` — display model for tool messages.
- `src/webview/pages/permissions/PermissionsPage.tsx` — settings/permissions page facade.
- `src/webview/pages/permissions/permissions-page/PermissionsPage.tsx` — settings implementation shell.
- `src/webview/pages/autonomous/AutonomousPage.tsx` — autonomous page facade.
- `src/webview/pages/isolation/IsolationPage.tsx` — isolated agent sessions UI.
- `src/webview/shared/lib/agentActions.ts` — webview-to-extension action facade.
- `src/webview/shared/lib/agentPatches/applyAgentPatch.ts` — state patch application.
- `src/webview/shared/types.ts` — shared webview type exports.
- `src/webview/shared/ui/index.ts` — UI-kit public exports.
- `src/webview/shared/i18n/*.json` — webview translations.

### Тесты

- `src/**/*.test.ts`, `src/**/*.test.tsx` — unit/regression tests рядом с кодом.
- `src/**/**.testParts/**` — разложенные части больших test suites.
- `tests/e2e/features/**` — Playwright e2e user flows.
- `tests/e2e/sources/**` — e2e helpers and OpenRouter mock.
- `tests/component-screenshots/**` — component screenshot harness/tests.
- `src/webview/**/*.stories.tsx` — Storybook stories for UI states.

## Как быстро искать нужное место

- Команды VS Code и настройки extension: начни с `package.json`, затем `src/extension.ts`.
- Chat/run lifecycle: `src/cli/daemonServer/methods/chatAsk.ts` → `src/core/app/runtime/agentRuntime.ts`.
- Model request bugs: `src/core/entities/model/*Transport.ts`, `src/cli/daemonServer/methods/createModelClientForModel.ts`, `createRoutingModelClient.ts`.
- Tool execution bugs: `src/core/features/tool-execution/**`, `src/core/tools/**`, `src/core/features/approval/**`.
- File edit preview bugs: `src/extension/tools/editableDiffPreview.ts` and `src/core/features/approval/approvalProtocol.ts`.
- Webview message bugs: `src/webview/shared/lib/agentActions/**` → `src/extension/agent/webview/messages/**`.
- UI state patch bugs: `src/extension/agent/webview/mapDaemonEventToChatPatch.ts` → `src/webview/shared/lib/agentPatches/**`.
- Chat list/state bugs: `src/core/entities/chat/chatRepository.ts`, `src/extension/agent/daemon/chatStore.ts`, `src/webview/pages/chat/**`.
- Settings UI bugs: `src/webview/pages/permissions/**`, `src/extension/agent/config/**`, `package.json` configuration schema.
- Memory behavior: `src/core/entities/memory/**`, `src/core/features/memory-subagent/**`, related e2e in `tests/e2e/features/memory-subagent/**`.
- Autonomous runner: `src/core/processes/autonomous/**`, `src/extension/autonomous/**`, `src/webview/pages/autonomous/**`.
- Performance telemetry: `src/core/features/performanceTelemetry/**`, settings telemetry page in `src/webview/pages/permissions/**/telemetry-*`.

## Правила изменений для агентов

- Сначала читай ближайший facade/orchestrator, затем детали в `*Parts`, `sources`, `utils`.
- Не нарушай boundary: `src/core/**` без `vscode`; webview без Node/VS Code API; extension не должен становиться backend source of truth.
- Для новых публичных импортов используй `index.ts`/facade, но не складывай туда реализацию.
- Сохраняй стиль проекта: небольшие функции, объектные аргументы, один helper/utility — один файл, тест рядом с изменением.
- Для UI-изменений проверяй design system и Storybook state; для e2e — e2e guide.
- После значимого изменения запускай focused unit test и `npm run typecheck`, если это уместно для задачи.
- Не утверждай, что проверка выполнена, если она не запускалась.

## Инструкция по актуализации карты

Если изменение кода меняет архитектурные границы, добавляет новый слой/feature, переносит ключевые entrypoints, меняет daemon/webview/core flow или добавляет важные команды/документы, обнови этот `AGENTS.md` в том же PR/изменении. Карта должна оставаться актуальным источником быстрого контекста для следующих ИИ-агентов.
